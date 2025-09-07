<template>
  <div class="contact-person-form">
    <form @submit.prevent="handleSubmit">
      <div class="formgrid grid">
        <!-- First Name -->
        <div class="field col-12 md:col-6">
          <v-text-field
            v-model="form.firstName"
            label="First Name *"
            :error-messages="errors.firstName ? [errors.firstName] : []"
          />
        </div>

        <!-- Last Name -->
        <div class="field col-12 md:col-6">
          <v-text-field
            v-model="form.lastName"
            label="Last Name *"
            :error-messages="errors.lastName ? [errors.lastName] : []"
          />
        </div>

        <!-- Email -->
        <div class="field col-12">
          <v-text-field
            v-model="form.email"
            type="email"
            label="Email *"
            :error-messages="errors.email ? [errors.email] : []"
          />
        </div>

        <!-- Phone -->
        <div class="field col-12 md:col-6">
          <v-text-field
            v-model="form.phone"
            label="Phone"
            :error-messages="errors.phone ? [errors.phone] : []"
          />
        </div>

        <!-- Title -->
        <div class="field col-12 md:col-6">
          <v-text-field
            v-model="form.title"
            label="Title"
            :error-messages="errors.title ? [errors.title] : []"
          />
        </div>

        <!-- Department -->
        <div class="field col-12">
          <v-text-field
            v-model="form.department"
            label="Department"
            :error-messages="errors.department ? [errors.department] : []"
          />
        </div>

        <!-- Primary Contact -->
        <div class="field col-12">
          <v-checkbox v-model="form.isPrimary" label="Set as primary contact" />
          <small class="text-600">
            Primary contacts are displayed first and used for main communications
          </small>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-content-end gap-2 mt-4">
        <v-btn variant="outlined" color="secondary" prepend-icon="mdi-close" @click="$emit('cancel')" type="button">Cancel</v-btn>
        <v-btn :loading="saving" color="primary" :prepend-icon="isEditing ? 'mdi-check' : 'mdi-plus'" type="submit">
          {{ isEditing ? 'Update Contact' : 'Add Contact' }}
        </v-btn>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { ContactPerson } from "@medical-crm/shared"
import { computed, reactive, ref, watch } from "vue"

interface Props {
  institutionId: string
  contact?: ContactPerson
}

interface Emits {
  (e: "contact-saved", contact: ContactPerson): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
// Notifications handled by parent (Vuetify snackbar)

const saving = ref(false)
const isEditing = computed(() => !!props.contact)

// Form data
const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  department: "",
  isPrimary: false,
})

// Form errors
const errors = reactive({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  department: "",
})

// Initialize form with contact data if editing
watch(
  () => props.contact,
  (contact) => {
    if (contact) {
      form.firstName = contact.firstName
      form.lastName = contact.lastName
      form.email = contact.email
      form.phone = contact.phone || ""
      form.title = contact.title || ""
      form.department = contact.department || ""
      form.isPrimary = contact.isPrimary
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  form.firstName = ""
  form.lastName = ""
  form.email = ""
  form.phone = ""
  form.title = ""
  form.department = ""
  form.isPrimary = false
  clearErrors()
}

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = ""
  })
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  // Required fields
  if (!form.firstName.trim()) {
    errors.firstName = "First name is required"
    isValid = false
  } else if (form.firstName.length > 50) {
    errors.firstName = "First name must be less than 50 characters"
    isValid = false
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required"
    isValid = false
  } else if (form.lastName.length > 50) {
    errors.lastName = "Last name must be less than 50 characters"
    isValid = false
  }

  if (!form.email.trim()) {
    errors.email = "Email is required"
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email address"
    isValid = false
  } else if (form.email.length > 255) {
    errors.email = "Email must be less than 255 characters"
    isValid = false
  }

  // Optional field validations
  if (
    form.phone &&
    !/^[\+]?[1-9][\d]{0,15}$/.test(form.phone.replace(/[\s\-\(\)]/g, ""))
  ) {
    errors.phone = "Please enter a valid phone number"
    isValid = false
  }

  if (form.title && form.title.length > 100) {
    errors.title = "Title must be less than 100 characters"
    isValid = false
  }

  if (form.department && form.department.length > 100) {
    errors.department = "Department must be less than 100 characters"
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  saving.value = true

  try {
    const contactData = {
      institutionId: props.institutionId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      title: form.title.trim() || undefined,
      department: form.department.trim() || undefined,
      isPrimary: form.isPrimary,
    }

    // In a real implementation, this would call the API
    // For now, we'll simulate the API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const savedContact: ContactPerson = {
      id: props.contact?.id || `contact-${Date.now()}`,
      ...contactData,
    }

    emit("contact-saved", savedContact)

    // Parent can display snackbar

    if (!isEditing.value) {
      resetForm()
    }
  } catch (error) {
    console.error("Error saving contact:", error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.contact-person-form {
  padding: 1rem 0;
}

.field {
  margin-bottom: 1rem;
}

.p-error {
  display: block;
  margin-top: 0.25rem;
}
</style>
