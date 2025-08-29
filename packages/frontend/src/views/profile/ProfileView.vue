<template>
  <AppLayout>
    <div class="profile">
      <div class="grid">
        <div class="col-12 md:col-4">
          <Card>
            <template #title>
              <div class="text-center">
                <i class="pi pi-user mr-2"></i>
                Profile
              </div>
            </template>
            <template #content>
              <div class="text-center">
                <Avatar
                  :image="authStore.userAvatar"
                  size="xlarge"
                  shape="circle"
                  class="mb-3"
                />
                <h3 class="mt-0 mb-2">{{ authStore.userName }}</h3>
                <p class="text-600 mb-3">{{ authStore.user?.email }}</p>
                <Tag
                  :value="authStore.userRole"
                  :severity="getRoleSeverity(authStore.userRole)"
                  class="mb-3"
                />
                <div class="mt-3">
                  <Button
                    label="Edit Profile"
                    icon="pi pi-pencil"
                    class="p-button-outlined"
                    @click="showEditDialog = true"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>

        <div class="col-12 md:col-8">
          <Card>
            <template #title>
              <i class="pi pi-info-circle mr-2"></i>
              Profile Information
            </template>
            <template #content>
              <div class="grid">
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">First Name</label>
                    <p class="mt-1">{{ authStore.user?.firstName || "Not set" }}</p>
                  </div>
                </div>
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">Last Name</label>
                    <p class="mt-1">{{ authStore.user?.lastName || "Not set" }}</p>
                  </div>
                </div>
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">Email</label>
                    <p class="mt-1">{{ authStore.user?.email || "Not set" }}</p>
                  </div>
                </div>
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">Role</label>
                    <p class="mt-1">{{ formatRole(authStore.userRole) }}</p>
                  </div>
                </div>
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">Status</label>
                    <p class="mt-1">
                      <Tag
                        :value="authStore.user?.isActive ? 'Active' : 'Inactive'"
                        :severity="authStore.user?.isActive ? 'success' : 'danger'"
                      />
                    </p>
                  </div>
                </div>
                <div class="col-12 md:col-6">
                  <div class="field">
                    <label class="font-semibold">Last Login</label>
                    <p class="mt-1">{{ formatDate(authStore.user?.lastLoginAt) }}</p>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Edit Profile Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Edit Profile"
      :style="{ width: '450px' }"
    >
      <form @submit.prevent="handleUpdateProfile" class="grid">
        <div class="col-12">
          <div class="field">
            <label for="firstName" class="block text-900 font-medium mb-2"
              >First Name</label
            >
            <InputText
              id="firstName"
              v-model="editForm.firstName"
              class="w-full"
              :class="{ 'p-invalid': firstNameError }"
            />
            <small v-if="firstNameError" class="p-error">{{ firstNameError }}</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="lastName" class="block text-900 font-medium mb-2"
              >Last Name</label
            >
            <InputText
              id="lastName"
              v-model="editForm.lastName"
              class="w-full"
              :class="{ 'p-invalid': lastNameError }"
            />
            <small v-if="lastNameError" class="p-error">{{ lastNameError }}</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="email" class="block text-900 font-medium mb-2">Email</label>
            <InputText
              id="email"
              v-model="editForm.email"
              type="email"
              class="w-full"
              :class="{ 'p-invalid': emailError }"
            />
            <small v-if="emailError" class="p-error">{{ emailError }}</small>
          </div>
        </div>
      </form>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="showEditDialog = false"
        />
        <Button
          label="Save"
          icon="pi pi-check"
          :loading="authStore.isLoading"
          @click="handleUpdateProfile"
        />
      </template>
    </Dialog>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import { useAuthStore } from "@/stores/auth"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Dialog from "primevue/dialog"
import InputText from "primevue/inputtext"
import Tag from "primevue/tag"
import { useToast } from "primevue/usetoast"
import { ref, watch } from "vue"

const authStore = useAuthStore()
const toast = useToast()

// Edit dialog state
const showEditDialog = ref(false)
const editForm = ref({
  firstName: "",
  lastName: "",
  email: "",
})

// Form validation
const firstNameError = ref("")
const lastNameError = ref("")
const emailError = ref("")

// Initialize edit form when dialog opens
watch(showEditDialog, (isVisible) => {
  if (isVisible && authStore.user) {
    editForm.value = {
      firstName: authStore.user.firstName || "",
      lastName: authStore.user.lastName || "",
      email: authStore.user.email || "",
    }
    // Clear errors
    firstNameError.value = ""
    lastNameError.value = ""
    emailError.value = ""
  }
})

const validateForm = () => {
  firstNameError.value = ""
  lastNameError.value = ""
  emailError.value = ""

  if (!editForm.value.firstName.trim()) {
    firstNameError.value = "First name is required"
  }

  if (!editForm.value.lastName.trim()) {
    lastNameError.value = "Last name is required"
  }

  if (!editForm.value.email.trim()) {
    emailError.value = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.value.email)) {
    emailError.value = "Please enter a valid email address"
  }

  return !firstNameError.value && !lastNameError.value && !emailError.value
}

const handleUpdateProfile = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await authStore.updateProfile({
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      email: editForm.value.email,
    })

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Profile updated successfully",
      life: 3000,
    })

    showEditDialog.value = false
  } catch (error: any) {
    console.error("Profile update failed:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: error.response?.data?.error?.message || "Failed to update profile",
      life: 5000,
    })
  }
}

const getRoleSeverity = (role?: string) => {
  switch (role) {
    case "super_admin":
      return "danger"
    case "team_admin":
      return "warning"
    case "user":
      return "info"
    default:
      return "secondary"
  }
}

const formatRole = (role?: string) => {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "team_admin":
      return "Team Admin"
    case "user":
      return "User"
    default:
      return "Unknown"
  }
}

const formatDate = (date?: Date | string) => {
  if (!date) return "Never"

  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
</script>

<style scoped>
.profile {
  padding: 1rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.25rem;
  color: #374151;
}

.field p {
  margin: 0;
  color: #6b7280;
}
</style>
