<template>
  <div class="rich-text-editor" :class="{ 'rich-text-editor--disabled': disabled }">
    <div v-if="editor && !disabled" class="toolbar">
      <v-btn-group density="compact" variant="outlined">
        <v-btn
          icon
          size="small"
          :class="{ 'v-btn--active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <v-icon size="small">mdi-format-bold</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          :class="{ 'v-btn--active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <v-icon size="small">mdi-format-italic</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          :class="{ 'v-btn--active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <v-icon size="small">mdi-format-list-bulleted</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          :class="{ 'v-btn--active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <v-icon size="small">mdi-format-list-numbered</v-icon>
        </v-btn>
      </v-btn-group>
    </div>
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { watch, onBeforeUnmount, nextTick } from "vue"

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    minHeight?: string
  }>(),
  {
    placeholder: "Saisissez le contenu...",
    disabled: false,
    minHeight: "150px",
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

// Flag to prevent update loops
let skipNextWatch = false

/**
 * Parse content - accepts JSON string, JSON object, or HTML
 */
function parseContent(value: string | undefined | null): any {
  if (!value) return ""

  // Try to parse as JSON first
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      return JSON.parse(value)
    } catch {
      // Not valid JSON, treat as HTML
      return value
    }
  }

  return value
}

/**
 * Serialize content to JSON string
 */
function serializeContent(editor: any): string {
  const json = editor.getJSON()
  return JSON.stringify(json)
}

const editor = useEditor({
  content: parseContent(props.modelValue),
  editable: !props.disabled,
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  onUpdate: ({ editor }) => {
    skipNextWatch = true
    // Emit JSON string instead of HTML
    emit("update:modelValue", serializeContent(editor))
    nextTick(() => {
      skipNextWatch = false
    })
  },
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (skipNextWatch) {
      return
    }

    if (editor.value && !editor.value.isDestroyed) {
      editor.value.commands.setContent(parseContent(newValue), false)
    }
  },
  { immediate: true }
)

// Watch for editor becoming ready
watch(
  () => editor.value,
  (editorInstance) => {
    if (editorInstance && !editorInstance.isDestroyed && props.modelValue) {
      editorInstance.commands.setContent(parseContent(props.modelValue), false)
    }
  }
)

// Watch for disabled state changes
watch(
  () => props.disabled,
  (disabled) => {
    if (editor.value) {
      editor.value.setEditable(!disabled)
    }
  }
)

// Cleanup on unmount
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
}

.rich-text-editor--disabled {
  opacity: 0.7;
  pointer-events: none;
}

.toolbar {
  padding: 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.toolbar .v-btn--active {
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
}

.editor-content {
  padding: 12px;
  min-height: v-bind(minHeight);
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: calc(v-bind(minHeight) - 24px);
}

.editor-content :deep(.ProseMirror p) {
  margin: 0 0 0.5em 0;
}

.editor-content :deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.editor-content :deep(.ProseMirror li) {
  margin: 0.25em 0;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: rgba(var(--v-theme-on-surface), 0.4);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
