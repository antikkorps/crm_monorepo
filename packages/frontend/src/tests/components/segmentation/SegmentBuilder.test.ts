import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import SegmentBuilder from '@/components/segmentation/SegmentBuilder.vue'
import { SegmentType } from '@medical-crm/shared'
import type { SegmentCriteria } from '@medical-crm/shared'

// Mock child components
vi.mock('@/components/segmentation/InstitutionFilterBuilder.vue', () => ({
  default: {
    name: 'InstitutionFilterBuilder',
    template: '<div data-testid="institution-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/ContactFilterBuilder.vue', () => ({
  default: {
    name: 'ContactFilterBuilder',
    template: '<div data-testid="contact-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/CombinedFilterBuilder.vue', () => ({
  default: {
    name: 'CombinedFilterBuilder',
    template: '<div data-testid="combined-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/SegmentPreview.vue', () => ({
  default: {
    name: 'SegmentPreview',
    template: '<div data-testid="segment-preview"></div>',
    props: ['segmentType', 'criteria', 'loading'],
    emits: ['preview-updated']
  }
}))

const mockI18nMessages = {
  en: {
    'segmentation.builder.title': 'Segment Builder',
    'segmentation.builder.segmentType': 'Segment Type',
    'segmentation.builder.segmentName': 'Segment Name',
    'segmentation.builder.institutionFilters': 'Institution Filters',
    'segmentation.builder.contactFilters': 'Contact Filters',
    'segmentation.builder.combinedFilters': 'Combined Filters',
    'segmentation.builder.preview.title': 'Preview',
    'segmentation.builder.saveSegment': 'Save Segment',
    'segmentation.types.institution': 'Institution',
    'segmentation.types.contact': 'Contact',
    'validation.required': 'This field is required',
    'validation.minLength': 'Minimum {min} characters',
    'validation.maxLength': 'Maximum {max} characters',
    'common.cancel': 'Cancel'
  }
}

describe('SegmentBuilder', () => {
  let wrapper: VueWrapper<any>
  let vuetify: any
  let i18n: any

  const createWrapper = (props = {}) => {
    return mount(SegmentBuilder, {
      global: {
        plugins: [
          vuetify,
          i18n
        ],
        stubs: {
          'v-card': { template: '<div><slot /></div>' },
          'v-card-title': { template: '<div><slot /></div>' },
          'v-card-text': { template: '<div><slot /></div>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-select': { template: '<select><slot /></select>' },
          'v-text-field': { template: '<input type="text" />' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-icon': { template: '<i><slot /></i>' },
          'v-spacer': { template: '<div />' },
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<div><slot /></div>' },
          'v-expansion-panel-title': { template: '<div><slot /></div>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-chip': { template: '<span><slot /></span>' }
        }
      },
      props
    })
  }

  beforeEach(() => {
    vuetify = createVuetify()
    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: mockI18nMessages
    })
  })

  it('should render correctly with default props', () => {
    wrapper = createWrapper()
    
    expect(wrapper.find('[data-testid="segment-preview"]').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('should validate segment name correctly', () => {
    wrapper = createWrapper()
    const nameRules = wrapper.vm.nameRules
    
    // Required validation
    expect(nameRules[0]('')).toBe('This field is required')
    expect(nameRules[0]('Valid name')).toBe(true)
    
    // Min length validation
    expect(nameRules[1]('ab')).toBe('Minimum 3 characters')
    expect(nameRules[1]('abc')).toBe(true)
    
    // Max length validation
    const longName = 'a'.repeat(101)
    expect(nameRules[2](longName)).toBe('Maximum 100 characters')
    expect(nameRules[2]('Valid name')).toBe(true)
  })

  it('should disable save button when name is invalid', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentName = 'ab' // Too short
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.canSave).toBe(false)
  })

  it('should disable save button when no filters are set', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentName = 'Valid name'
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.canSave).toBe(false)
  })

  it('should enable save button when valid name and filters exist', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentName = 'Valid name'
    wrapper.vm.institutionFilters = [{ field: 'name', value: 'test', operator: 'equals' }]
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.canSave).toBe(true)
  })

  it('should emit save event with correct data', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentName = 'Test Segment'
    wrapper.vm.segmentType = SegmentType.INSTITUTION
    wrapper.vm.institutionFilters = [{ field: 'name', value: 'test', operator: 'equals' }]
    await wrapper.vm.$nextTick()
    
    await wrapper.vm.saveSegment()
    
    const emittedData = wrapper.emitted('save')
    expect(emittedData).toBeTruthy()
    if (emittedData && emittedData[0]) {
      expect(emittedData[0][0]).toEqual({
        name: 'Test Segment',
        type: SegmentType.INSTITUTION,
        criteria: expect.any(Object)
      })
    }
  })

  it('should reset builder correctly', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentName = 'Test Name'
    wrapper.vm.segmentType = SegmentType.CONTACT
    wrapper.vm.institutionFilters = [{ field: 'name', value: 'test', operator: 'equals' }]
    wrapper.vm.contactFilters = [{ field: 'email', value: 'test@test.com', operator: 'contains' }]
    await wrapper.vm.$nextTick()
    
    await wrapper.vm.resetBuilder()
    
    expect(wrapper.vm.segmentName).toBe('')
    expect(wrapper.vm.segmentType).toBe(SegmentType.INSTITUTION)
    expect(wrapper.vm.institutionFilters).toEqual([])
    expect(wrapper.vm.contactFilters).toEqual([])
    expect(wrapper.vm.combinedFilters).toEqual([])
  })

  it('should update criteria when filters change', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentType = SegmentType.INSTITUTION
    wrapper.vm.institutionFilters = [{ field: 'name', value: 'test', operator: 'equals' }]
    await wrapper.vm.$nextTick()
    
    const criteria = wrapper.vm.currentCriteria
    expect(criteria).toHaveProperty('institutionFilters')
  })

  it('should switch filter panels when segment type changes', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.segmentType = SegmentType.CONTACT
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.activePanels).toContain(1) // Contact filters panel
    expect(wrapper.vm.activePanels).toContain(2) // Combined filters panel
  })
})