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

  let { uid }: { uid: string } = $props()
  let data: UserData | null = $state(null)
  let error: string | null = $state(null)
  let fortuneTexts: Map<string, string> = $state(new Map())
  let copiedIdx: number | null = $state(null)
  let viewMode: 'hex' | 'ascii' = $state('hex')

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

  function formatCardData(hex: string, mode: 'hex' | 'ascii'): string {
    const blockSize = 32 // 16 bytes = 32 hex chars
    const blocks: string[] = []
    for (let i = 0; i < hex.length; i += blockSize) {
      blocks.push(hex.slice(i, i + blockSize))
    }
    // Group into sectors of 4 blocks, skip sectors where data blocks (first 3) are all zeros
    const lines: string[] = []
    for (let s = 0; s < blocks.length; s += 4) {
      const dataBlocks = blocks.slice(s, s + 3)
      const trailer = blocks[s + 3]
      const allZero = dataBlocks.every(b => /^0*$/.test(b))
      if (allZero) continue
      lines.push(`sector ${s / 4}`)
      for (let j = 0; j < dataBlocks.length; j++) {
        if (dataBlocks[j]) lines.push(`  ${String(s + j).padStart(3, '0')}  ${formatBlock(dataBlocks[j], mode)}`)
      }
      if (trailer) lines.push(`  ${String(s + 3).padStart(3, '0')}  ${formatBlock(trailer, mode)}  [trailer]`)
    }
    return lines.join('\n') || '(empty)'
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

  $effect(() => {
    fetchUser()
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
      </div>
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
            <pre class="data-dump">{formatCardData(event.data, viewMode)}</pre>
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
    word-break: break-all;
    white-space: pre-wrap;
    user-select: text;
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
