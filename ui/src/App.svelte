<script lang="ts">
  import UserList from './lib/UserList.svelte'
  import FortuneList from './lib/FortuneList.svelte'

  let view: 'users' | 'fortunes' = $state('users')
</script>

<h1>neoband fortune admin</h1>

<nav>
  <button class:active={view === 'users'} onclick={() => view = 'users'}>users</button>
  <button class:active={view === 'fortunes'} onclick={() => view = 'fortunes'}>fortunes</button>
</nav>

{#if view === 'users'}
  <UserList />
{:else}
  <FortuneList />
{/if}

<style>
  nav {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  button {
    font-family: inherit;
    font-size: 14px;
    padding: 4px 12px;
    background: var(--bg-card);
    color: var(--text);
    border: 1px solid var(--border);
    cursor: pointer;
  }
  button.active {
    color: var(--amber);
    border-color: var(--amber);
  }
</style>
