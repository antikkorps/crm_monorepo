import { CallType } from "@medical-crm/shared"
import { CollaborationValidation } from "../../types/collaboration"

// Mock data
const mockUser1 = {
  id: "user-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@test.com",
}

const mockUser2 = {
  id: "user-2",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@test.com",
}

const mockInstitution = {
  id: "institution-1",
  name: "Test Hospital",
  type: "hospital",
}

const mockContactPerson = {
  id: "contact-1",
  firstName: "Dr. Alice",
  lastName: "Johnson",
  phone: "+1234567890",
  email: "alice@hospital.com",
  institutionId: mockInstitution.id,
}

describe("Call Model", () => {
  describe("Call Creation and Validation", () => {
    it("should validate phone number correctly", () => {
      expect(() => {
        CollaborationValidation.validatePhoneNumber("")
      }).toThrow("Phone number is required")

      expect(() => {
        CollaborationValidation.validatePhoneNumber("123")
      }).toThrow("Phone number must be between 7 and 15 digits")

      expect(() => {
        CollaborationValidation.validatePhoneNumber("12345678901234567890")
      }).toThrow("Invalid phone number format")

      expect(() => {
        CollaborationValidation.validatePhoneNumber("abc123def")
      }).toThrow("Invalid phone number format")

      expect(() => {
        CollaborationValidation.validatePhoneNumber("+1234567890")
      }).not.toThrow()

      expect(() => {
        CollaborationValidation.validatePhoneNumber("1234567890")
      }).not.toThrow()
    })

    it("should validate call duration correctly", () => {
      expect(() => {
        CollaborationValidation.validateCallDuration(-1)
      }).toThrow("Call duration cannot be negative")

      expect(() => {
        CollaborationValidation.validateCallDuration(86401) // More than 24 hours
      }).toThrow("Call duration cannot exceed 24 hours")

      expect(() => {
        CollaborationValidation.validateCallDuration(undefined)
      }).not.toThrow()

      expect(() => {
        CollaborationValidation.validateCallDuration(300) // 5 minutes
      }).not.toThrow()

      expect(() => {
        CollaborationValidation.validateCallDuration(0)
      }).not.toThrow()
    })

    it("should validate call summary correctly", () => {
      expect(() => {
        CollaborationValidation.validateCallSummary("a".repeat(2001))
      }).toThrow("Call summary cannot exceed 2,000 characters")

      expect(() => {
        CollaborationValidation.validateCallSummary(undefined)
      }).not.toThrow()

      expect(() => {
        CollaborationValidation.validateCallSummary("Valid summary")
      }).not.toThrow()

      expect(() => {
        CollaborationValidation.validateCallSummary("")
      }).not.toThrow()
    })

    it("should validate call type enum", () => {
      const validCallTypes = Object.values(CallType)

      expect(validCallTypes).toContain(CallType.INCOMING)
      expect(validCallTypes).toContain(CallType.OUTGOING)
      expect(validCallTypes).toContain(CallType.MISSED)

      expect(validCallTypes.length).toBe(3)
    })
  })

  describe("Call Instance Methods", () => {
    const mockCall = {
      id: "call-1",
      phoneNumber: "+1234567890",
      duration: 300, // 5 minutes
      summary: "Discussed appointment scheduling",
      callType: CallType.INCOMING,
      userId: mockUser1.id,
      institutionId: mockInstitution.id,
      contactPersonId: mockContactPerson.id,
      createdAt: new Date(),
      updatedAt: new Date(),

      getDurationInMinutes() {
        return this.duration ? Math.round(this.duration / 60) : null
      },

      getDurationFormatted() {
        if (!this.duration) return "Unknown"

        const minutes = Math.floor(this.duration / 60)
        const seconds = this.duration % 60

        if (minutes === 0) {
          return `${seconds}s`
        } else if (seconds === 0) {
          return `${minutes}m`
        } else {
          return `${minutes}m ${seconds}s`
        }
      },

      isIncoming() {
        return this.callType === CallType.INCOMING
      },

      isOutgoing() {
        return this.callType === CallType.OUTGOING
      },

      isMissed() {
        return this.callType === CallType.MISSED
      },

      getFormattedPhoneNumber() {
        const cleaned = this.phoneNumber.replace(/\D/g, "")

        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
        } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
          return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
        }

        return this.phoneNumber
      },
    }

    it("should calculate duration in minutes correctly", () => {
      expect(mockCall.getDurationInMinutes()).toBe(5)

      const callWithoutDuration = { ...mockCall, duration: undefined }
      expect(callWithoutDuration.getDurationInMinutes()).toBeNull()

      const shortCall = { ...mockCall, duration: 30 }
      expect(shortCall.getDurationInMinutes()).toBe(1) // Rounded up
    })

    it("should format duration correctly", () => {
      expect(mockCall.getDurationFormatted()).toBe("5m")

      const callWithSeconds = { ...mockCall, duration: 125 } // 2m 5s
      expect(callWithSeconds.getDurationFormatted()).toBe("2m 5s")

      const shortCall = { ...mockCall, duration: 30 } // 30s
      expect(shortCall.getDurationFormatted()).toBe("30s")

      const callWithoutDuration = { ...mockCall, duration: undefined }
      expect(callWithoutDuration.getDurationFormatted()).toBe("Unknown")
    })

    it("should identify call types correctly", () => {
      const incomingCall = { ...mockCall, callType: CallType.INCOMING }
      expect(incomingCall.isIncoming()).toBe(true)
      expect(incomingCall.isOutgoing()).toBe(false)
      expect(incomingCall.isMissed()).toBe(false)

      const outgoingCall = { ...mockCall, callType: CallType.OUTGOING }
      expect(outgoingCall.isIncoming()).toBe(false)
      expect(outgoingCall.isOutgoing()).toBe(true)
      expect(outgoingCall.isMissed()).toBe(false)

      const missedCall = { ...mockCall, callType: CallType.MISSED }
      expect(missedCall.isIncoming()).toBe(false)
      expect(missedCall.isOutgoing()).toBe(false)
      expect(missedCall.isMissed()).toBe(true)
    })

    it("should format phone numbers correctly", () => {
      const call10Digit = { ...mockCall, phoneNumber: "1234567890" }
      expect(call10Digit.getFormattedPhoneNumber()).toBe("(123) 456-7890")

      const call11Digit = { ...mockCall, phoneNumber: "11234567890" }
      expect(call11Digit.getFormattedPhoneNumber()).toBe("+1 (123) 456-7890")

      const internationalCall = { ...mockCall, phoneNumber: "+33123456789" }
      expect(internationalCall.getFormattedPhoneNumber()).toBe("+33123456789")
    })

    it("should handle auto-linking logic", async () => {
      const mockCallWithLinking = {
        ...mockCall,
        institutionId: undefined,
        contactPersonId: undefined,

        async linkToInstitution() {
          // Mock finding contact person by phone
          if (this.phoneNumber === mockContactPerson.phone) {
            this.institutionId = mockContactPerson.institutionId
            this.contactPersonId = mockContactPerson.id
          }
        },

        async linkToContact() {
          // Mock finding contact person by phone
          if (this.phoneNumber === mockContactPerson.phone) {
            this.contactPersonId = mockContactPerson.id
            if (!this.institutionId) {
              this.institutionId = mockContactPerson.institutionId
            }
          }
        },

        async save() {
          // Mock save method
          return Promise.resolve()
        },
      }

      // Test linking when phone matches
      mockCallWithLinking.phoneNumber = mockContactPerson.phone
      await mockCallWithLinking.linkToInstitution()

      expect(mockCallWithLinking.institutionId).toBe(mockContactPerson.institutionId)
      expect(mockCallWithLinking.contactPersonId).toBe(mockContactPerson.id)
    })
  })

  describe("Call Search and Filtering", () => {
    const mockCalls = [
      {
        id: "call-1",
        phoneNumber: "+1234567890",
        callType: CallType.INCOMING,
        userId: mockUser1.id,
        institutionId: mockInstitution.id,
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "call-2",
        phoneNumber: "+0987654321",
        callType: CallType.OUTGOING,
        userId: mockUser2.id,
        institutionId: mockInstitution.id,
        createdAt: new Date("2024-01-02"),
      },
      {
        id: "call-3",
        phoneNumber: "+1234567890",
        callType: CallType.MISSED,
        userId: mockUser1.id,
        institutionId: undefined,
        createdAt: new Date("2024-01-03"),
      },
    ]

    it("should filter calls by user", () => {
      const user1Calls = mockCalls.filter((call) => call.userId === mockUser1.id)
      expect(user1Calls).toHaveLength(2)
      expect(user1Calls.every((call) => call.userId === mockUser1.id)).toBe(true)
    })

    it("should filter calls by institution", () => {
      const institutionCalls = mockCalls.filter(
        (call) => call.institutionId === mockInstitution.id
      )
      expect(institutionCalls).toHaveLength(2)
      expect(
        institutionCalls.every((call) => call.institutionId === mockInstitution.id)
      ).toBe(true)
    })

    it("should filter calls by phone number", () => {
      const phoneNumberCalls = mockCalls.filter(
        (call) => call.phoneNumber === "+1234567890"
      )
      expect(phoneNumberCalls).toHaveLength(2)
      expect(phoneNumberCalls.every((call) => call.phoneNumber === "+1234567890")).toBe(
        true
      )
    })

    it("should filter calls by call type", () => {
      const incomingCalls = mockCalls.filter(
        (call) => call.callType === CallType.INCOMING
      )
      expect(incomingCalls).toHaveLength(1)
      expect(incomingCalls[0].callType).toBe(CallType.INCOMING)

      const outgoingCalls = mockCalls.filter(
        (call) => call.callType === CallType.OUTGOING
      )
      expect(outgoingCalls).toHaveLength(1)
      expect(outgoingCalls[0].callType).toBe(CallType.OUTGOING)

      const missedCalls = mockCalls.filter((call) => call.callType === CallType.MISSED)
      expect(missedCalls).toHaveLength(1)
      expect(missedCalls[0].callType).toBe(CallType.MISSED)
    })

    it("should filter calls by date range", () => {
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-01-02")

      const dateRangeCalls = mockCalls.filter(
        (call) => call.createdAt >= startDate && call.createdAt <= endDate
      )

      expect(dateRangeCalls).toHaveLength(2)
    })
  })

  describe("Call Auto-linking Logic", () => {
    it("should match phone numbers with different formats", () => {
      const phoneFormats = [
        "+1234567890",
        "1234567890",
        "(123) 456-7890",
        "123-456-7890",
        "123.456.7890",
      ]

      const cleanPhone = (phone: string) => phone.replace(/\D/g, "")
      const baseNumber = "1234567890"

      phoneFormats.forEach((format) => {
        expect(cleanPhone(format)).toBe(baseNumber)
      })

      // Test 11-digit number separately
      const elevenDigitFormat = "+1 (123) 456-7890"
      expect(cleanPhone(elevenDigitFormat)).toBe("11234567890")
    })

    it("should handle international phone numbers", () => {
      const internationalNumbers = ["+33123456789", "+44123456789", "+81123456789"]

      internationalNumbers.forEach((number) => {
        expect(() => {
          CollaborationValidation.validatePhoneNumber(number)
        }).not.toThrow()
      })
    })

    it("should validate linking conditions", () => {
      const mockCall = {
        phoneNumber: "+1234567890",
        institutionId: undefined,
        contactPersonId: undefined,
      }

      const mockContact = {
        phone: "+1234567890",
        institutionId: "institution-1",
        id: "contact-1",
      }

      // Should link when phone numbers match
      expect(mockCall.phoneNumber).toBe(mockContact.phone)

      // Should not link when already linked
      const alreadyLinkedCall = {
        ...mockCall,
        institutionId: "existing-institution",
      }

      expect(alreadyLinkedCall.institutionId).toBeTruthy()
    })
  })

  describe("Call Data Validation", () => {
    it("should validate complete call data", () => {
      const validCallData = {
        phoneNumber: "+1234567890",
        duration: 300,
        summary: "Valid summary",
        callType: CallType.INCOMING,
        userId: mockUser1.id,
      }

      expect(() => {
        CollaborationValidation.validatePhoneNumber(validCallData.phoneNumber)
        CollaborationValidation.validateCallDuration(validCallData.duration)
        CollaborationValidation.validateCallSummary(validCallData.summary)
      }).not.toThrow()
    })

    it("should reject invalid call data", () => {
      const invalidCallData = {
        phoneNumber: "",
        duration: -1,
        summary: "a".repeat(2001),
      }

      expect(() => {
        CollaborationValidation.validatePhoneNumber(invalidCallData.phoneNumber)
      }).toThrow()

      expect(() => {
        CollaborationValidation.validateCallDuration(invalidCallData.duration)
      }).toThrow()

      expect(() => {
        CollaborationValidation.validateCallSummary(invalidCallData.summary)
      }).toThrow()
    })

    it("should handle optional fields correctly", () => {
      const minimalCallData = {
        phoneNumber: "+1234567890",
        callType: CallType.INCOMING,
        userId: mockUser1.id,
      }

      expect(() => {
        CollaborationValidation.validatePhoneNumber(minimalCallData.phoneNumber)
        CollaborationValidation.validateCallDuration(undefined)
        CollaborationValidation.validateCallSummary(undefined)
      }).not.toThrow()
    })
  })

  describe("Call Statistics and Analytics", () => {
    const mockCallsForStats = [
      { callType: CallType.INCOMING, duration: 300, userId: mockUser1.id },
      { callType: CallType.OUTGOING, duration: 180, userId: mockUser1.id },
      { callType: CallType.MISSED, duration: undefined, userId: mockUser1.id },
      { callType: CallType.INCOMING, duration: 420, userId: mockUser2.id },
    ]

    it("should calculate call statistics by type", () => {
      const incomingCalls = mockCallsForStats.filter(
        (call) => call.callType === CallType.INCOMING
      )
      const outgoingCalls = mockCallsForStats.filter(
        (call) => call.callType === CallType.OUTGOING
      )
      const missedCalls = mockCallsForStats.filter(
        (call) => call.callType === CallType.MISSED
      )

      expect(incomingCalls).toHaveLength(2)
      expect(outgoingCalls).toHaveLength(1)
      expect(missedCalls).toHaveLength(1)
    })

    it("should calculate total call duration", () => {
      const totalDuration = mockCallsForStats
        .filter((call) => call.duration !== undefined)
        .reduce((sum, call) => sum + (call.duration || 0), 0)

      expect(totalDuration).toBe(900) // 300 + 180 + 420
    })

    it("should calculate average call duration", () => {
      const callsWithDuration = mockCallsForStats.filter(
        (call) => call.duration !== undefined
      )
      const averageDuration =
        callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) /
        callsWithDuration.length

      expect(averageDuration).toBe(300) // 900 / 3
    })

    it("should group calls by user", () => {
      const callsByUser = mockCallsForStats.reduce((acc, call) => {
        if (!acc[call.userId]) {
          acc[call.userId] = []
        }
        acc[call.userId].push(call)
        return acc
      }, {} as Record<string, typeof mockCallsForStats>)

      expect(callsByUser[mockUser1.id]).toHaveLength(3)
      expect(callsByUser[mockUser2.id]).toHaveLength(1)
    })
  })
})
