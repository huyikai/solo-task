import { computed, type Ref } from 'vue'
import type { Task, TaskTreeNode } from '../types/task'

export function useTaskTree(tasks: Ref<Task[]>) {
  const tree = computed<TaskTreeNode[]>(() => {
    const map = new Map<string, TaskTreeNode>()

    for (const t of tasks.value) {
      map.set(t.id, { ...t, children: [] })
    }

    const roots: TaskTreeNode[] = []
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  })

  function getChildren(parentId: string): TaskTreeNode[] {
    const all = tree.value
    function find(nodes: TaskTreeNode[]): TaskTreeNode[] {
      for (const n of nodes) {
        if (n.id === parentId) return n.children
        const found = find(n.children)
        if (found.length) return found
      }
      return []
    }
    return find(all)
  }

  return { tree, getChildren }
}
