import { computed, ref, type ComputedRef, type Ref } from "vue"

export interface ValidationRule {
  required?: boolean
  email?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface FieldValidation {
  value: Ref<any>
  error: Ref<string>
  rules: ValidationRule[]
  validate: () => void
  isValid: ComputedRef<boolean>
}

export function useFormValidation() {
  const createField = (
    initialValue: any = "",
    rules: ValidationRule[] = []
  ): FieldValidation => {
    const value = ref(initialValue)
    const error = ref("")

    const validate = () => {
      error.value = ""

      for (const rule of rules) {
        if (rule.required && (!value.value || value.value.toString().trim() === "")) {
          error.value = "This field is required"
          return
        }

        if (
          rule.email &&
          value.value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value)
        ) {
          error.value = "Please enter a valid email address"
          return
        }

        if (rule.minLength && value.value && value.value.length < rule.minLength) {
          error.value = `Minimum length is ${rule.minLength} characters`
          return
        }

        if (rule.maxLength && value.value && value.value.length > rule.maxLength) {
          error.value = `Maximum length is ${rule.maxLength} characters`
          return
        }

        if (rule.pattern && value.value && !rule.pattern.test(value.value)) {
          error.value = "Invalid format"
          return
        }

        if (rule.custom && value.value) {
          const customError = rule.custom(value.value)
          if (customError) {
            error.value = customError
            return
          }
        }
      }
    }

    const isValid = computed(
      () => !error.value && (rules.some((r) => r.required) ? !!value.value : true)
    )

    return {
      value,
      error,
      rules,
      validate,
      isValid,
    }
  }

  const validateForm = (fields: FieldValidation[]): boolean => {
    fields.forEach((field) => field.validate())
    return fields.every((field) => field.isValid)
  }

  return {
    createField,
    validateForm,
  }
}

// Common validation rules
export const validationRules = {
  required: { required: true },
  email: { email: true },
  minLength: (length: number) => ({ minLength: length }),
  maxLength: (length: number) => ({ maxLength: length }),
  pattern: (pattern: RegExp) => ({ pattern }),
  custom: (validator: (value: any) => string | null) => ({ custom: validator }),
}
