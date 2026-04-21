<script lang="ts">
  interface User {
    uid: string
    lastSeen: string
    neoname: string | null
  }

  let users: User[] = $state([])
  let nextCursor: string | null = $state(null)
  let prevCursor: string | null = $state(null)
  let search = $state('')
  let selectedUid: string | null = $state(null)
  let loading = $state(false)
  let currentCursor: string | undefined = undefined
  let prevReaderUid: string | null = null

  async function fetchUsers(cursor?: string) {
    loading = true
    currentCursor = cursor
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (search) params.set('neoname', search)
    const res = await fetch(`/api/user?${params}`)
    const data = await res.json()
    users = data.users
    nextCursor = data.nextCursor
    prevCursor = data.prevCursor
    loading = false
  }

  async function pollForNewScan() {
    try {
      const res = await fetch('/api/reader/status')
      if (!res.ok) return
      const next: { uid: string | null } = await res.json()
      // A band just came off the reader — a new scan likely landed in the DB.
      if (prevReaderUid !== null && next.uid !== prevReaderUid) {
        fetchUsers(currentCursor)
      }
      prevReaderUid = next.uid
    } catch {
      // ignore — kiosk process may not be running
    }
  }

  $effect(() => {
    fetchUsers()
    const interval = setInterval(pollForNewScan, 2000)
    return () => clearInterval(interval)
  })

  function doSearch() {
    selectedUid = null
    fetchUsers()
  }
</script>

<div class="search">
  <input
    type="text"
    placeholder="search by neoname..."
    bind:value={search}
    onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && doSearch()}
  />
  <button onclick={doSearch}>search</button>
</div>

{#if selectedUid}
  <button class="back" onclick={() => selectedUid = null}>&larr; back</button>
  {#await import('./UserDetail.svelte') then module}
    <module.default uid={selectedUid} />
  {/await}
{:else}
  {#if loading}
    <p class="muted">loading...</p>
  {:else if users.length === 0}
    <p class="muted">no users found</p>
  {:else}
    <ul>
      {#each users as user}
        <li>
          <button class="user-row" onclick={() => selectedUid = user.uid}>
            <span class="uid">{user.uid}</span>
            {#if user.neoname}
              <span class="neoname">{user.neoname}</span>
            {/if}
            <span class="date">{new Date(user.lastSeen).toLocaleDateString()}</span>
          </button>
        </li>
      {/each}
    </ul>

    <div class="pagination">
      <button disabled={!prevCursor} onclick={() => fetchUsers(prevCursor!)}>prev</button>
      <button disabled={!nextCursor} onclick={() => fetchUsers(nextCursor!)}>next</button>
    </div>
  {/if}
{/if}

<style>
  .search {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  input {
    font-family: inherit;
    font-size: 14px;
    padding: 4px 8px;
    background: var(--bg-card);
    color: var(--text-bright);
    border: 1px solid var(--border);
    flex: 1;
  }
  .search button, .back, .pagination button {
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
  .back {
    margin-bottom: 12px;
  }
  ul { list-style: none; }
  .user-row {
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
  }
  .user-row:hover { border-color: var(--amber); }
  .uid { color: var(--cyan); }
  .neoname { color: var(--green); }
  .date { margin-left: auto; color: var(--text); }
  .muted { color: var(--text); }
  .pagination {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
</style>
