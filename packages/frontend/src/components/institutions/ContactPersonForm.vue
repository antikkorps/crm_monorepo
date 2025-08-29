<template>
  <div class="contact-person-form">
    <form @submit.prevent="handleSubmit">
      <div class="formgrid grid">
        <!-- First Name -->
        <div class="field col-12 md:col-6">
          <label for="firstName" class="block text-900 font-medium mb-2">
            First Name *
          </label>
          <InputText
            id="firstName"
            v-model="form.firstName"
            class="w-full"
            :class="{ 'p-invalid': errors.firstName }"
            placeholder="Enter first name"
          />
          <small v-if="errors.firstName" class="p-error">{{ errors.firstName }}</small>
        </div>

        <!-- Last Name -->
        <div class="field col-12 md:col-6">
          <label for="lastName" class="block text-900 font-medium mb-2">
            Last Name *
          </label>
          <InputText
            id="lastName"
            v-model="form.lastName"
            class="w-full"
            :class="{ 'p-invalid': errors.lastName }"
            placeholder="Enter last name"
          />
          <small v-if="errors.lastName" class="p-error">{{ errors.lastName }}</small>
        </div>

        <!-- Email -->
        <div class="field col-12">
          <label for="email" class="block text-900 font-medium mb-2">Email *</label>
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            class="w-full"
            :class="{ 'p-invalid': errors.email }"
            placeholder="Enter email address"
          />
          <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
        </div>

        <!-- Phone -->
        <div class="field col-12 md:col-6">
          <label for="phone" class="block text-900 font-medium mb-2">Phone</label>
          <InputText
            id="phone"
            v-model="form.phone"
            class="w-full"
            :class="{ 'p-invalid': errors.phone }"
            placeholder="Enter phone number"
          />
          <small v-if="errors.phone" class="p-error">{{ errors.phone }}</small>
        </div>

        <!-- Title -->
        <div class="field col-12 md:col-6">
          <label for="title" class="block text-900 font-medium mb-2">Title</label>
          <InputText
            id="title"
            v-model="form.title"
            class="w-full"
            :class="{ 'p-invalid': errors.title }"
            placeholder="Enter job title"
          />
          <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
        </div>

        <!-- Department -->
        <div class="field col-12">
          <label for="department" class="block text-900 font-medium mb-2"
            >Department</label
          >
          <InputText
            id="department"
            v-model="form.department"
            class="w-full"
            :class="{ 'p-invalid': errors.department }"
            placeholder="Enter department"
          />
          <small v-if="errors.department" class="p-error">{{ errors.department }}</small>
        </div>

        <!-- Primary Contact -->
        <div class="field col-12">
          <div class="flex align-items-center">
            <Checkbox id="isPrimary" v-model="form.isPrimary" :binary="true" />
            <label for="isPrimary" class="ml-2 text-900 font-medium">
              Set as primary contact
            </label>
          </div>
          <small class="text-600">
            Primary contacts are displayed first and used for main communications
          </small>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-content-end gap-2 mt-4">
        <Button
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="$emit('cancel')"
          type="button"
        />
        <Button
          :label="isEditing ? 'Update Contact' : 'Add Contact'"
          :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
          :loading="saving"
          type="submit"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { ContactPerson } from "@medical-crm/shared"
import Button from "primevue/button"
import Checkbox from "primevue/checkbox"
import InputText from "primevue/inputtext"
import { useToast } from "primevue/usetoast"
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
const toast = useToast()

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

const resetForm = () => {
  form.firstName = ""
  form.lastName = ""
  form.email = ""
  form.phone = ""
  form.title = ""
  form.department = ""
  form.isPrimary = false
  clearErrors()
}

const clearErrors = () => {
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

    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Contact ${isEditing.value ? "updated" : "added"} successfully`,
      life: 3000,
    })

    if (!isEditing.value) {
      resetForm()
    }
  } catch (error) {
    console.error("Error saving contact:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: `Failed to ${isEditing.value ? "update" : "add"} contact`,
      life: 3000,
    })
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
