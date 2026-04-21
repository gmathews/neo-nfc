<script lang="ts">
  interface FeedbackEvent {
    type: 'feedback'
    createdAt: string
    fortuneId: number
    fortuneVersion: number
    reaction: number
    comment: string
    neoname: string | null
  }

  interface CardReadEvent {
    type: 'card_read'
    createdAt: string
    data: string
  }

  type UserEvent = FeedbackEvent | CardReadEvent

  interface UserData {
    lastFeedback: FeedbackEvent | null
    lastData: CardReadEvent | null
    events: UserEvent[]
    nextCursor: string | null
    prevCursor: string | null
  }

  interface FortuneText {
    text: string
  }

  interface ReaderStatus {
    present: boolean
    uid: string | null
    readerName: string | null
  }

  interface WriteResult {
    uid: string
    written: number
    skipped: number
  }

  let { uid }: { uid: string } = $props()
  let data: UserData | null = $state(null)
  let error: string | null = $state(null)
  let fortuneTexts: Map<string, string> = $state(new Map())
  let copiedIdx: number | null = $state(null)
  let viewMode: 'hex' | 'ascii' = $state('hex')
  let reader: ReaderStatus = $state({ present: false, uid: null, readerName: null })
  let writing: number | null = $state(null)
  let writeStatus: { idx: number; text: string; ok: boolean } | null = $state(null)
  let prevReaderUid: string | null = null
  let editingBlock: { eventIdx: number; block: number } | null = $state(null)
  let editValue = $state('')
  let savingBlock = $state(false)
  let blockStatus: { eventIdx: number; block: number; ok: boolean; text: string } | null = $state(null)

  function hexToAscii(hex: string): string {
    let out = ''
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16)
      out += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.'
    }
    return out
  }

  function formatBlock(block: string, mode: 'hex' | 'ascii'): string {
    return mode === 'ascii' ? hexToAscii(block) : block
  }

  type BlockEntry =
    | { kind: 'sector'; n: number }
    | { kind: 'block'; block: number; data: string; isTrailer: boolean; editable: boolean }

  // Sector trailer detection for MIFARE Classic 1k/4k:
  //   low 32 sectors × 4 blocks, then 8 sectors × 16 blocks starting at block 128.
  function isTrailerBlock(block: number): boolean {
    const lowSectorBlocks = 32 * 4
    if (block < lowSectorBlocks) return block % 4 === 3
    return (block - lowSectorBlocks) % 16 === 15
  }

  function structureCardData(hex: string): BlockEntry[] {
    const blockSize = 32
    const blocks: string[] = []
    for (let i = 0; i < hex.length; i += blockSize) blocks.push(hex.slice(i, i + blockSize))
    const entries: BlockEntry[] = []
    for (let s = 0; s < blocks.length; s += 4) {
      const dataBlocks = blocks.slice(s, s + 3)
      const trailer = blocks[s + 3]
      const allZero = dataBlocks.every(b => /^0*$/.test(b))
      if (allZero) continue
      entries.push({ kind: 'sector', n: s / 4 })
      for (let j = 0; j < dataBlocks.length; j++) {
        if (!dataBlocks[j]) continue
        const block = s + j
        entries.push({
          kind: 'block',
          block,
          data: dataBlocks[j],
          isTrailer: false,
          editable: block !== 0 && !isTrailerBlock(block),
        })
      }
      if (trailer) {
        entries.push({ kind: 'block', block: s + 3, data: trailer, isTrailer: true, editable: false })
      }
    }
    return entries
  }

  async function fetchUser(cursor?: string) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`/api/user/${uid}?${params}`)
    if (res.status === 404) {
      error = 'user not found'
      return
    }
    data = await res.json()
    loadFortuneTexts()
  }

  async function loadFortuneTexts() {
    if (!data) return
    const ids = new Set<string>()
    for (const e of data.events) {
      if (e.type === 'feedback') {
        const key = `${e.fortuneId}:${e.fortuneVersion}`
        if (!fortuneTexts.has(key)) ids.add(key)
      }
    }
    if (data.lastFeedback) {
      const key = `${data.lastFeedback.fortuneId}:${data.lastFeedback.fortuneVersion}`
      if (!fortuneTexts.has(key)) ids.add(key)
    }
    for (const key of ids) {
      const [id, version] = key.split(':')
      const res = await fetch(`/api/fortune/${id}?version=${version}`)
      if (res.ok) {
        const f: FortuneText = await res.json()
        fortuneTexts.set(key, f.text)
        fortuneTexts = new Map(fortuneTexts)
      }
    }
  }

  function getFortuneText(id: number, version: number): string | undefined {
    return fortuneTexts.get(`${id}:${version}`)
  }

  async function copyData(text: string, idx: number) {
    await navigator.clipboard.writeText(text)
    copiedIdx = idx
    setTimeout(() => { if (copiedIdx === idx) copiedIdx = null }, 1500)
  }

  async function fetchReaderStatus() {
    try {
      const res = await fetch('/api/reader/status')
      if (!res.ok) return
      const next: ReaderStatus = await res.json()
      // When this user's band leaves the reader, the scan is already saved
      // to the DB — pull the updated event list.
      if (prevReaderUid === uid && next.uid !== uid) fetchUser()
      prevReaderUid = next.uid
      reader = next
    } catch {
      // ignore — kiosk process may not be running
    }
  }

  function startEditBlock(eventIdx: number, block: number, data: string) {
    editingBlock = { eventIdx, block }
    editValue = data
    blockStatus = null
  }

  function cancelEditBlock() {
    editingBlock = null
    editValue = ''
  }

  async function saveBlock(eventIdx: number) {
    if (!editingBlock || savingBlock) return
    const { block } = editingBlock
    if (!/^[0-9a-fA-F]{32}$/.test(editValue)) {
      blockStatus = { eventIdx, block, ok: false, text: 'must be 32 hex chars' }
      return
    }
    savingBlock = true
    try {
      const res = await fetch('/api/reader/block', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ block, data: editValue }),
      })
      const body = await res.json()
      if (res.ok) {
        blockStatus = { eventIdx, block, ok: true, text: `wrote to ${body.uid}` }
        editingBlock = null
      } else {
        blockStatus = { eventIdx, block, ok: false, text: body.error ?? `error ${res.status}` }
      }
    } catch (err) {
      blockStatus = { eventIdx, block, ok: false, text: String(err) }
    } finally {
      savingBlock = false
      const snap = blockStatus
      if (snap?.ok) setTimeout(() => { if (blockStatus === snap) blockStatus = null }, 4000)
    }
  }

  async function writeToBand(scanData: string, idx: number) {
    if (writing !== null) return
    writing = idx
    writeStatus = null
    try {
      const res = await fetch('/api/reader/write', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: scanData }),
      })
      const body = await res.json()
      if (res.ok) {
        const r = body as WriteResult
        writeStatus = { idx, text: `wrote ${r.written} blocks (skipped ${r.skipped}) to ${r.uid}`, ok: true }
      } else {
        writeStatus = { idx, text: body.error ?? `error ${res.status}`, ok: false }
      }
    } catch (err) {
      writeStatus = { idx, text: String(err), ok: false }
    } finally {
      writing = null
      setTimeout(() => { if (writeStatus?.idx === idx) writeStatus = null }, 4000)
    }
  }

  $effect(() => {
    fetchUser()
    fetchReaderStatus()
    const interval = setInterval(fetchReaderStatus, 2000)
    return () => clearInterval(interval)
  })

  function reactionLabel(r: number): string {
    if (r === 1) return '▲'
    if (r === -1) return '▼'
    return '●'
  }

  function reactionColor(r: number): string {
    if (r === 1) return 'var(--green)'
    if (r === -1) return 'var(--red)'
    return 'var(--amber)'
  }
</script>

<h2>{uid}</h2>

{#if error}
  <p class="muted">{error}</p>
{:else if !data}
  <p class="muted">loading...</p>
{:else}
  <div class="summary">
    {#if data.lastFeedback}
      {@const ft = getFortuneText(data.lastFeedback.fortuneId, data.lastFeedback.fortuneVersion)}
      <div class="card">
        <span class="label">last feedback</span>
        <span style="color: {reactionColor(data.lastFeedback.reaction)}">{reactionLabel(data.lastFeedback.reaction)}</span>
        {#if data.lastFeedback.neoname}
          <span class="neoname">{data.lastFeedback.neoname}</span>
        {/if}
        <span class="date">{new Date(data.lastFeedback.createdAt).toLocaleDateString()}</span>
        {#if ft}
          <p class="fortune-text">{ft}</p>
        {/if}
      </div>
    {/if}
    {#if data.lastData}
      <div class="card">
        <span class="label">last scan</span>
        <span class="date">{new Date(data.lastData.createdAt).toLocaleDateString()}</span>
        <button class="copy-btn" onclick={() => copyData(data!.lastData!.data, -1)}>
          {copiedIdx === -1 ? 'copied' : 'copy'}
        </button>
        <button
          class="write-btn"
          disabled={!reader.present || writing !== null}
          onclick={() => writeToBand(data!.lastData!.data, -1)}
          title={reader.present ? `write to ${reader.uid}` : 'no card on reader'}
        >
          {writing === -1 ? 'writing...' : 'write to band'}
        </button>
        {#if writeStatus?.idx === -1}
          <span class="write-status" class:err={!writeStatus.ok}>{writeStatus.text}</span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="reader-status">
    {#if reader.present}
      <span class="dot on"></span>
      <span>card on reader: <span class="uid">{reader.uid}</span></span>
    {:else}
      <span class="dot off"></span>
      <span class="muted">no card on reader</span>
    {/if}
  </div>

  <h2>events</h2>
  {#if data.events.length === 0}
    <p class="muted">no events</p>
  {:else}
    <ul>
      {#each data.events as event, i}
        <li class="event">
          <div class="event-header">
            <span class="tag" class:feedback={event.type === 'feedback'} class:card_read={event.type === 'card_read'}>
              {event.type === 'feedback' ? 'feedback' : 'scan'}
            </span>
            <span class="date">{new Date(event.createdAt).toLocaleString()}</span>
            {#if event.type === 'feedback'}
              <span style="color: {reactionColor(event.reaction)}">{reactionLabel(event.reaction)}</span>
              {#if event.neoname}<span class="neoname">{event.neoname}</span>{/if}
            {/if}
            {#if event.type === 'card_read'}
              <button class="copy-btn" onclick={() => viewMode = viewMode === 'hex' ? 'ascii' : 'hex'}>
                {viewMode}
              </button>
              <button class="copy-btn" onclick={() => copyData((event as CardReadEvent).data, i)}>
                {copiedIdx === i ? 'copied' : 'copy'}
              </button>
              <button
                class="write-btn"
                disabled={!reader.present || writing !== null}
                onclick={() => writeToBand((event as CardReadEvent).data, i)}
                title={reader.present ? `write to ${reader.uid}` : 'no card on reader'}
              >
                {writing === i ? 'writing...' : 'write to band'}
              </button>
              {#if writeStatus?.idx === i}
                <span class="write-status" class:err={!writeStatus.ok}>{writeStatus.text}</span>
              {/if}
            {/if}
          </div>
          {#if event.type === 'feedback'}
            {@const ft = getFortuneText(event.fortuneId, event.fortuneVersion)}
            {#if ft}
              <p class="fortune-text">fortune #{event.fortuneId}: {ft}</p>
            {/if}
            {#if event.comment}
              <p class="comment">"{event.comment}"</p>
            {/if}
          {/if}
          {#if event.type === 'card_read'}
            {@const entries = structureCardData((event as CardReadEvent).data)}
            <div class="data-dump">
              {#each entries as entry}
                {#if entry.kind === 'sector'}
                  <div class="sector-label">sector {entry.n}</div>
                {:else}
                  <div class="block-row" class:trailer={entry.isTrailer}>
                    <span class="block-num">{String(entry.block).padStart(3, '0')}</span>
                    {#if editingBlock && editingBlock.eventIdx === i && editingBlock.block === entry.block}
                      <input
                        type="text"
                        class="block-input"
                        bind:value={editValue}
                        maxlength={32}
                        disabled={savingBlock}
                        onkeydown={(e: KeyboardEvent) => {
                          if (e.key === 'Enter') saveBlock(i)
                          else if (e.key === 'Escape') cancelEditBlock()
                        }}
                      />
                      <button class="copy-btn" disabled={savingBlock} onclick={() => saveBlock(i)}>
                        {savingBlock ? 'saving...' : 'save'}
                      </button>
                      <button class="copy-btn" disabled={savingBlock} onclick={cancelEditBlock}>cancel</button>
                    {:else}
                      <span class="block-data">{formatBlock(entry.data, viewMode)}</span>
                      {#if entry.isTrailer}<span class="trailer-tag">[trailer]</span>{/if}
                      {#if entry.editable && viewMode === 'hex' && reader.present}
                        <button
                          class="copy-btn"
                          disabled={editingBlock !== null}
                          onclick={() => startEditBlock(i, entry.block, entry.data)}
                        >edit</button>
                      {/if}
                    {/if}
                    {#if blockStatus && blockStatus.eventIdx === i && blockStatus.block === entry.block}
                      <span class="write-status" class:err={!blockStatus.ok}>{blockStatus.text}</span>
                    {/if}
                  </div>
                {/if}
              {/each}
              {#if entries.length === 0}<div>(empty)</div>{/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>

    <div class="pagination">
      <button disabled={!data.prevCursor} onclick={() => fetchUser(data!.prevCursor!)}>prev</button>
      <button disabled={!data.nextCursor} onclick={() => fetchUser(data!.nextCursor!)}>next</button>
    </div>
  {/if}
{/if}

<style>
  .summary {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .card {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    flex: 1;
    align-items: center;
  }
  .card .fortune-text {
    width: 100%;
    margin: 4px 0 0;
  }
  .label { color: var(--text); }
  .neoname { color: var(--green); }
  .date { color: var(--text); margin-left: auto; }
  ul { list-style: none; }
  .event {
    padding: 8px;
    border-bottom: 1px solid var(--border);
  }
  .event-header {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tag {
    font-size: 12px;
    padding: 1px 6px;
    border: 1px solid;
  }
  .tag.feedback { color: var(--amber); border-color: var(--amber); }
  .tag.card_read { color: var(--cyan); border-color: var(--cyan); }
  .fortune-text {
    color: var(--green);
    font-size: 13px;
    margin: 4px 0;
  }
  .comment {
    color: var(--text-bright);
    font-size: 13px;
    font-style: italic;
  }
  .data-dump {
    font-family: inherit;
    font-size: 12px;
    color: var(--cyan);
    background: var(--bg);
    padding: 6px 8px;
    margin: 4px 0 0;
    overflow-x: auto;
    user-select: text;
  }
  .sector-label { color: var(--text); margin-top: 4px; }
  .sector-label:first-child { margin-top: 0; }
  .block-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 16px;
  }
  .block-row.trailer .block-data { opacity: 0.6; }
  .block-num { color: var(--text); }
  .block-data {
    font-family: inherit;
    word-break: break-all;
    user-select: text;
  }
  .trailer-tag { color: var(--text); font-size: 11px; }
  .block-input {
    font-family: inherit;
    font-size: 12px;
    padding: 1px 4px;
    background: var(--bg-card);
    color: var(--text-bright);
    border: 1px solid var(--cyan);
    min-width: 280px;
  }
  .copy-btn {
    font-family: inherit;
    font-size: 12px;
    padding: 1px 8px;
    background: var(--bg-card);
    color: var(--cyan);
    border: 1px solid var(--cyan);
    cursor: pointer;
  }
  .copy-btn:hover { background: var(--bg); }
  .write-btn {
    font-family: inherit;
    font-size: 12px;
    padding: 1px 8px;
    background: var(--bg-card);
    color: var(--amber);
    border: 1px solid var(--amber);
    cursor: pointer;
  }
  .write-btn:hover:not(:disabled) { background: var(--bg); }
  .write-btn:disabled { opacity: 0.3; cursor: default; }
  .write-status { font-size: 12px; color: var(--green); }
  .write-status.err { color: var(--red); }
  .reader-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .reader-status .uid { color: var(--cyan); }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .dot.on { background: var(--green); }
  .dot.off { background: var(--text); opacity: 0.4; }
  .muted { color: var(--text); }
  .pagination {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .pagination button {
    font-family: inherit;
    font-size: 14px;
    padding: 4px 12px;
    background: var(--bg-card);
    color: var(--text);
    border: 1px solid var(--border);
    cursor: pointer;
  }
  .pagination button:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
