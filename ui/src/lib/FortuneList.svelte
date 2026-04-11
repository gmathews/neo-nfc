<script lang="ts">
  interface Fortune {
    id: number
    text: string
  }

  interface FortuneDetail {
    id: number
    version: number
    text: string
    feedback: { count: number; sum: number }
  }

  let fortunes: Fortune[] = $state([])
  let filtered: Fortune[] = $state([])
  let nextCursor: number | null = $state(null)
  let prevCursor: number | null = $state(null)
  let selected: FortuneDetail | null = $state(null)
  let loading = $state(false)
  let search = $state('')
  let editText = $state('')
  let editing = $state(false)
  let saving = $state(false)

  async function fetchFortunes(cursor?: number) {
    loading = true
    const params = new URLSearchParams()
    if (cursor !== undefined) params.set('cursor', String(cursor))
    const res = await fetch(`/api/fortune?${params}`)
    const data = await res.json()
    fortunes = data.fortunes
    filtered = data.fortunes
    nextCursor = data.nextCursor
    prevCursor = data.prevCursor
    loading = false
  }

  function filterFortunes() {
    const q = search.trim().toLowerCase()
    if (!q) {
      filtered = fortunes
      return
    }
    const asNum = Number(q)
    if (!isNaN(asNum)) {
      // Search by ID — jump directly
      selectFortune(asNum)
      return
    }
    filtered = fortunes.filter(f => f.text.toLowerCase().includes(q))
  }

  async function selectFortune(id: number) {
    const res = await fetch(`/api/fortune/${id}`)
    if (!res.ok) {
      selected = null
      return
    }
    selected = await res.json()
    editText = selected!.text
    editing = false
  }

  async function saveFortune() {
    if (!selected) return
    saving = true
    const res = await fetch(`/api/fortune/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText }),
    })
    if (res.ok) {
      selected = await res.json()
      editText = selected!.text
      editing = false
    }
    saving = false
  }

  $effect(() => {
    fetchFortunes()
  })
</script>

{#if selected}
  <button class="back" onclick={() => { selected = null; editing = false }}>&larr; back</button>
  <div class="detail">
    <h2>fortune #{selected.id}</h2>
    {#if editing}
      <textarea bind:value={editText} rows="3"></textarea>
      <div class="edit-actions">
        <button class="save" disabled={saving} onclick={saveFortune}>{saving ? 'saving...' : 'save'}</button>
        <button onclick={() => { editing = false; editText = selected!.text }}>cancel</button>
      </div>
    {:else}
      <p class="fortune-text">{selected.text}</p>
      <button class="edit-btn" onclick={() => editing = true}>edit</button>
    {/if}
    <div class="meta">
      <span>v{selected.version}</span>
      <span>feedback: {selected.feedback.count} responses, score {selected.feedback.sum}</span>
    </div>
  </div>
{:else}
  <div class="search">
    <input
      type="text"
      placeholder="search by id or text..."
      bind:value={search}
      oninput={filterFortunes}
      onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && filterFortunes()}
    />
  </div>

  {#if loading}
    <p class="muted">loading...</p>
  {:else if filtered.length === 0}
    <p class="muted">no fortunes found</p>
  {:else}
    <ul>
      {#each filtered as fortune}
        <li>
          <button class="fortune-row" onclick={() => selectFortune(fortune.id)}>
            <span class="id">#{fortune.id}</span>
            <span class="text">{fortune.text}</span>
          </button>
        </li>
      {/each}
    </ul>

    <div class="pagination">
      <button disabled={!prevCursor} onclick={() => fetchFortunes(prevCursor!)}>prev</button>
      <button disabled={!nextCursor} onclick={() => fetchFortunes(nextCursor!)}>next</button>
    </div>
  {/if}
{/if}

<style>
  .search {
    margin-bottom: 12px;
  }
  .search input {
    font-family: inherit;
    font-size: 14px;
    padding: 4px 8px;
    background: var(--bg-card);
    color: var(--text-bright);
    border: 1px solid var(--border);
    width: 100%;
  }
  .back, .pagination button, .edit-btn, .edit-actions button {
    font-family: inherit;
    font-size: 14px;
    padding: 4px 12px;
    background: var(--bg-card);
    color: var(--text);
    border: 1px solid var(--border);
    cursor: pointer;
  }
  .back { margin-bottom: 12px; }
  .pagination button:disabled { opacity: 0.3; cursor: default; }
  ul { list-style: none; }
  .fortune-row {
    display: flex;
    width: 100%;
    gap: 12px;
    padding: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 4px;
    text-align: left;
  }
  .fortune-row:hover { border-color: var(--amber); }
  .id { color: var(--amber); white-space: nowrap; }
  .text { color: var(--text-bright); }
  .detail {
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .fortune-text {
    color: var(--green);
    margin: 8px 0;
  }
  textarea {
    font-family: inherit;
    font-size: 14px;
    width: 100%;
    padding: 8px;
    background: var(--bg);
    color: var(--green);
    border: 1px solid var(--amber);
    resize: vertical;
    margin: 8px 0;
  }
  .edit-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .save { color: var(--green); border-color: var(--green); }
  .edit-btn { margin: 8px 0; }
  .meta {
    display: flex;
    gap: 16px;
    color: var(--text);
    font-size: 12px;
  }
  .muted { color: var(--text); }
  .pagination {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
</style>
