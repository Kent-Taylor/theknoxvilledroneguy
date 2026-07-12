<script setup>
import { faFacebookF, faInstagram, faTiktok } from '@fortawesome/free-brands-svg-icons'
import {
  BarElement,
  BarController,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { buildSocialProfileUrl, formatApplicationSubmittedAt } from './application-utils.js'
import toursImage from './assets/services/360-tours.jpg'
import commercialImage from './assets/services/commercial.jpg'
import constructionImage from './assets/services/construction.jpg'
import customContentImage from './assets/services/custom-content.jpg'
import eventsImage from './assets/services/events.jpg'
import inspectionsImage from './assets/services/inspections.jpg'
import realEstateImage from './assets/services/real-estate.jpg'
import heroImage from './assets/knoxville-drone-hero.png'
import logoImage from './assets/knoxville-drone-guy-logo.png'

Chart.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

const services = [
  {
    name: 'Real Estate Photo & Video',
    icon: '⌂',
    image: realEstateImage,
    description:
      'Listing-ready aerial photos and cinematic video for homes, land, luxury properties, and short-term rentals.',
  },
  {
    name: 'Commercial Property',
    icon: '▦',
    iconClass: 'building',
    image: commercialImage,
    description:
      'Sharp exterior visuals for businesses, venues, developments, rooftops, storefronts, and investment properties.',
  },
  {
    name: 'Construction Progress',
    icon: '⚒',
    image: constructionImage,
    description:
      'Repeatable drone flights that document milestones, site conditions, progress updates, and stakeholder reporting.',
  },
  {
    name: 'Events & Tourism',
    icon: '⌖',
    image: eventsImage,
    description:
      'Modern highlight clips for outdoor events, attractions, neighborhoods, resorts, and destination marketing.',
  },
  {
    name: 'Inspections',
    icon: '⌕',
    image: inspectionsImage,
    description:
      'Detailed aerial visuals for roofs, lots, towers, buildings, and hard-to-reach areas without the extra hassle.',
  },
  {
    name: 'Custom Drone Content',
    icon: '',
    iconClass: 'video',
    image: customContentImage,
    description:
      'Flexible flight plans for social campaigns, promo videos, reveal shots, FPV fly-throughs, and creative brand content.',
  },
]

const tourService = {
  name: '360 Tours',
  icon: '360',
  image: toursImage,
  description:
    'Interactive 120-megapixel ground and aerial 360 tours that let viewers explore properties, yachts, cars, and unique spaces in a more immersive way.',
}

const tourFeatures = [
  { icon: '', iconClass: 'camera', title: '120 Megapixel', label: 'Ultra high resolution' },
  { icon: '⌘', title: 'Aerial & Ground', label: 'Capture' },
  { icon: '◎', title: 'Interactive', label: 'Experience' },
  { icon: '', iconClass: 'phone', title: 'Access Anywhere', label: 'Anytime' },
]

const featuredStats = [
  {
    title: 'Custom Solutions',
    description: 'Tailored aerial services designed around your unique project goals.',
    icon: '✦',
    theme: 'dark',
  },
  {
    title: 'Quality Assured',
    description: 'High-end equipment and precise techniques deliver stunning, reliable results.',
    icon: '✓',
    theme: 'light',
  },
  {
    title: 'Fast Turnaround',
    description: 'Quick delivery without compromising quality, because timing matters.',
    icon: '◴',
    theme: 'dark',
  },
  {
    title: 'Clear Communication',
    description: 'Responsive, transparent communication every step of the way.',
    icon: '',
    iconClass: 'message',
    theme: 'light',
  },
  {
    title: 'Fully Licensed & Insured',
    description: 'FAA certified with full insurance for your peace of mind.',
    icon: '✓',
    theme: 'dark',
  },
]

const bookingHref =
  'mailto:theknoxvilledroneguy@gmail.com?subject=Drone%20booking%20request'
const phoneNumber = '8014277833'
const socialLinks = [
  {
    name: 'Instagram',
    icon: faInstagram,
    url: 'https://www.instagram.com/the_knoxville_drone_guy/',
  },
  {
    name: 'TikTok',
    icon: faTiktok,
    url: 'https://www.tiktok.com/@the_knoxville_drone_guy',
  },
  {
    name: 'Facebook',
    icon: faFacebookF,
    url: 'https://www.facebook.com/profile.php?id=61559774199765',
  },
]
const legalLinks = [
  { name: 'Work With Us', path: '/careers' },
  { name: 'Privacy Policy', path: '/privacy-policy' },
  { name: 'Terms of Service', path: '/terms-of-service' },
]

const currentPath = ref(window.location.pathname)
const galleryItems = ref([])
const adminItems = ref([])
const jobs = ref([])
const jobApplications = ref([])
const timeTracker = ref(null)
const timeTrackerStatus = ref('Loading time tracker...')
const timeSaveStatus = ref('')
const ALL_TIME_CLIENTS_ID = 'all'
const selectedTimeClientId = ref(ALL_TIME_CLIENTS_ID)
const selectedTimeMonth = ref('all')
const isTimeClientPanelOpen = ref(false)
const isTimeProjectPanelOpen = ref(false)
const activeTimeChartTab = ref('weekly-hours')
const expandedJobIds = ref(new Set())
const visibleGalleryCount = ref(20)
const galleryStatus = ref('Loading gallery...')
const galleryError = ref('')
const authStatus = ref({ loggedIn: false, user: null })
const draggedItemId = ref('')
const selectedAdminItemId = ref('')
const selectedGalleryItem = ref(null)
const saveStatus = ref('')
const careersStatus = ref('')
const applicationStatus = ref({ type: '', message: '' })
const applicationSubmitting = ref(false)
const jobForm = ref({ id: null, title: '', description: '' })
const timeClientForm = ref({
  id: null,
  name: '',
  billingType: 'recurring_monthly',
  monthlyPayment: 0,
  monthlyExpectedHours: 0,
  targetHourlyRate: 75,
})
const timeEntryForm = ref({
  id: null,
  clientId: '',
  projectName: '',
  editingStartDate: '',
  editingEndDate: '',
  filmingHours: 0,
  drivingHours: 0,
  editingHours: 0,
  projectFee: 0,
  notes: '',
})
const timeEntryModalForm = ref({
  id: null,
  clientId: '',
  projectName: '',
  editingStartDate: '',
  editingEndDate: '',
  filmingHours: 0,
  drivingHours: 0,
  editingHours: 0,
  projectFee: 0,
  notes: '',
})
const editingTimeEntry = ref(null)
const jobEditor = ref(null)
const selectedJob = ref(null)
const timeChartCanvas = ref(null)
let timeChartInstance = null
const applicationForm = ref({
  name: '',
  age: '',
  city: '',
  state: '',
  instagram: '',
  tiktok: '',
  resume_name: '',
  resume_type: '',
  resume_data_url: '',
})
const loadingMediaIds = ref(new Set())
const richTextColors = [
  { name: 'Gold', value: '#d9a321' },
  { name: 'Ink', value: '#24191a' },
  { name: 'Muted', value: '#8b7d80' },
  { name: 'Green', value: '#24351f' },
]

const page = computed(() => {
  if (currentPath.value === '/gallery') {
    return 'gallery'
  }

  if (currentPath.value === '/login') {
    return 'login'
  }

  if (currentPath.value === '/careers') {
    return 'careers'
  }

  if (currentPath.value === '/time-tracker') {
    return 'time-tracker'
  }

  if (currentPath.value === '/privacy-policy') {
    return 'privacy'
  }

  if (currentPath.value === '/terms-of-service') {
    return 'terms'
  }

  return 'home'
})

const selectedAdminItem = computed(() =>
  adminItems.value.find((item) => item.id === selectedAdminItemId.value),
)

const visibleGalleryItems = computed(() => galleryItems.value.slice(0, visibleGalleryCount.value))
const hasMoreGalleryItems = computed(() => visibleGalleryCount.value < galleryItems.value.length)
const timeTrackerClients = computed(() => timeTracker.value?.clients || [])
const isAllTimeClientsSelected = computed(
  () => selectedTimeClientId.value === ALL_TIME_CLIENTS_ID || !selectedTimeClientId.value,
)
const selectedTimeClient = computed(() =>
  isAllTimeClientsSelected.value
    ? null
    : timeTrackerClients.value.find((client) => String(client.id) === String(selectedTimeClientId.value)) ||
      null,
)
const scopedTimeClients = computed(() =>
  isAllTimeClientsSelected.value ? timeTrackerClients.value : selectedTimeClient.value ? [selectedTimeClient.value] : [],
)
const allTimeEntries = computed(() =>
  timeTrackerClients.value.flatMap((client) =>
    (client.entries || []).map((entry) => ({
      ...entry,
      clientId: entry.clientId || client.id,
      clientName: entry.clientName || client.name,
      clientBillingType: client.billingType || 'recurring_monthly',
      clientMonthlyPayment: Number(client.monthlyPayment) || 0,
      clientMonthlyExpectedHours: Number(client.monthlyExpectedHours) || 0,
    })),
  ),
)
const scopedTimeEntries = computed(() => {
  if (isAllTimeClientsSelected.value) {
    return allTimeEntries.value
  }

  return allTimeEntries.value.filter(
    (entry) => String(entry.clientId) === String(selectedTimeClient.value?.id),
  )
})
const timeMonthOptions = computed(() => {
  const monthMap = new Map()

  for (const entry of allTimeEntries.value) {
    const month = getMonthBucket(entry.editingStartDate)

    if (month) {
      monthMap.set(month.key, month)
    }
  }

  return [...monthMap.values()].sort((a, b) => b.key.localeCompare(a.key))
})
const filteredTimeEntries = computed(() => {
  if (selectedTimeMonth.value === 'all') {
    return scopedTimeEntries.value
  }

  return scopedTimeEntries.value.filter(
    (entry) => getMonthBucket(entry.editingStartDate)?.key === selectedTimeMonth.value,
  )
})
const timeTrackerSummary = computed(() =>
  buildTimeDashboardSummary({
    clients: scopedTimeClients.value,
    entries: filteredTimeEntries.value,
    isAll: isAllTimeClientsSelected.value,
    selectedClient: selectedTimeClient.value,
  }),
)
const selectedTimeEntryClient = computed(
  () =>
    timeTrackerClients.value.find((client) => String(client.id) === String(timeEntryForm.value.clientId)) ||
    selectedTimeClient.value ||
    timeTrackerClients.value[0] ||
    null,
)
const selectedModalEntryClient = computed(
  () =>
    timeTrackerClients.value.find((client) => String(client.id) === String(timeEntryModalForm.value.clientId)) ||
    null,
)
const isTimeClientRecurring = computed(
  () => timeClientForm.value.billingType !== 'project_based',
)
const isSelectedTimeClientRecurring = computed(
  () => !isAllTimeClientsSelected.value && selectedTimeClient.value?.billingType !== 'project_based',
)
const isSelectedEntryClientProjectBased = computed(
  () => selectedTimeEntryClient.value?.billingType === 'project_based',
)
const isModalEntryClientProjectBased = computed(
  () => selectedModalEntryClient.value?.billingType === 'project_based',
)
const shouldShowTimeMoneyColumns = computed(
  () =>
    isAllTimeClientsSelected.value ||
    selectedTimeClient.value?.billingType === 'project_based' ||
    timeTrackerSummary.value.entries.some((entry) => Number(entry.projectFee) > 0),
)
const peakTrackerMonth = computed(() => {
  const months = timeTrackerSummary.value.months || []
  return months.reduce((peak, month) => (!peak || month.hours > peak.hours ? month : peak), null)
})
const overThresholdMonths = computed(() =>
  (timeTrackerSummary.value.months || []).filter((month) => month.overThreshold),
)
const weeklyTrackerHours = computed(() => {
  const weekMap = new Map()

  for (const entry of timeTrackerSummary.value.entries || []) {
    const week = getWeekBucket(entry.editingStartDate)

    if (!week) {
      continue
    }

    const currentWeek = weekMap.get(week.key) || {
      ...week,
      hours: 0,
      projects: 0,
    }

    currentWeek.hours += Number(entry.totalHours) || 0
    currentWeek.projects += 1
    weekMap.set(week.key, currentWeek)
  }

  return [...weekMap.values()].sort((a, b) => a.key.localeCompare(b.key))
})
const peakTrackerWeek = computed(() =>
  weeklyTrackerHours.value.reduce((peak, week) => (!peak || week.hours > peak.hours ? week : peak), null),
)
const averageWeeklyHours = computed(() => {
  const activeWeeks = weeklyTrackerHours.value.filter((week) => week.hours > 0)
  const totalHours = activeWeeks.reduce((sum, week) => sum + week.hours, 0)

  return activeWeeks.length ? totalHours / activeWeeks.length : 0
})
const maxWeeklyHours = computed(() =>
  weeklyTrackerHours.value.reduce((max, week) => Math.max(max, week.hours), 0),
)
const timeChartTabs = computed(() => [
  { id: 'weekly-hours', label: 'Weekly Hours' },
  { id: 'monthly-hours', label: 'Monthly Hours' },
  { id: 'income', label: 'Income' },
  { id: 'effective-rate', label: 'Effective Rate' },
  { id: 'incomplete-work', label: 'Incomplete Work' },
])
const timeChartData = computed(() => {
  const months = timeTrackerSummary.value.months || []

  return {
    'weekly-hours': {
      title: 'Weekly hours trend',
      helper: 'Line chart of total logged hours grouped Monday through Sunday.',
      labels: weeklyTrackerHours.value.map((week) => week.label),
      datasets: [
        {
          type: 'line',
          label: 'Hours',
          data: weeklyTrackerHours.value.map((week) => week.hours),
          borderColor: '#d9a321',
          backgroundColor: 'rgba(216, 163, 41, 0.16)',
          fill: true,
          tension: 0.34,
        },
      ],
      unit: 'hrs',
    },
    'monthly-hours': {
      title: isSelectedTimeClientRecurring.value ? 'Monthly hours vs target' : 'Monthly hours',
      helper: isSelectedTimeClientRecurring.value
        ? 'Bars show logged hours. The dark line shows expected monthly hours.'
        : 'Bars show total logged hours grouped by month.',
      labels: months.map((month) => month.label),
      datasets: [
        {
          type: 'bar',
          label: 'Logged hours',
          data: months.map((month) => month.hours),
          backgroundColor: 'rgba(216, 163, 41, 0.76)',
          borderColor: '#c58b1c',
          borderWidth: 1,
        },
        ...(isSelectedTimeClientRecurring.value
          ? [
              {
                type: 'line',
                label: 'Expected hours',
                data: months.map(() => timeTrackerSummary.value.thresholdHours || 0),
                borderColor: '#24191a',
                backgroundColor: '#24191a',
                pointRadius: 3,
                tension: 0,
              },
            ]
          : []),
      ],
      unit: 'hrs',
    },
    income: {
      title: 'Income by month',
      helper: 'Recurring retainers count once for months with logged work. Project fees count where entered.',
      labels: months.map((month) => month.label),
      datasets: [
        {
          type: 'bar',
          label: 'Revenue',
          data: months.map((month) => month.revenue),
          backgroundColor: 'rgba(47, 66, 31, 0.78)',
          borderColor: '#24351f',
          borderWidth: 1,
        },
      ],
      unit: '$',
    },
    'effective-rate': {
      title: 'Effective hourly rate',
      helper: 'Line chart of pay divided by logged hours for each month.',
      labels: months.map((month) => month.label),
      datasets: [
        {
          type: 'line',
          label: 'Effective rate',
          data: months.map((month) => month.effectiveHourlyRate || 0),
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.14)',
          fill: true,
          tension: 0.3,
        },
      ],
      unit: '$/hr',
    },
    'incomplete-work': {
      title: 'Incomplete work',
      helper: 'Draft rows missing dates or hours, grouped by month plus unscheduled work.',
      labels: timeTrackerSummary.value.incompleteBuckets.map((bucket) => bucket.label),
      datasets: [
        {
          type: 'bar',
          label: 'Incomplete entries',
          data: timeTrackerSummary.value.incompleteBuckets.map((bucket) => bucket.count),
          backgroundColor: 'rgba(127, 29, 29, 0.72)',
          borderColor: '#7f1d1d',
          borderWidth: 1,
        },
      ],
      unit: 'count',
    },
  }
})
const activeTimeChart = computed(() => timeChartData.value[activeTimeChartTab.value])
const activeTimeChartHasData = computed(() =>
  Boolean(activeTimeChart.value?.datasets.some((dataset) => dataset.data.some((value) => Number(value) > 0))),
)
const timeChartSignature = computed(() =>
  JSON.stringify({
    tab: activeTimeChartTab.value,
    page: page.value,
    clientId: selectedTimeClientId.value || '',
    month: selectedTimeMonth.value,
    chart: activeTimeChart.value,
  }),
)
const loginError = computed(() => {
  if (page.value !== 'login') {
    return ''
  }

  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  const email = params.get('email')

  if (error === 'not_allowed') {
    return email
      ? `${email} is not allowed as an admin. Add it to GOOGLE_ADMIN_EMAILS in Railway.`
      : 'That Google account is not allowed as an admin. Add it to GOOGLE_ADMIN_EMAILS in Railway.'
  }

  if (error === 'invalid_state') {
    return 'That login session expired. Please try signing in again.'
  }

  return error ? `Google login failed: ${error}` : ''
})

function navigate(path) {
  window.history.pushState({}, '', path)
  currentPath.value = path
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handlePopState() {
  currentPath.value = window.location.pathname
}

function normalizeRoute() {
  if (window.location.pathname === '/instagram') {
    window.history.replaceState({}, '', '/gallery')
    currentPath.value = '/gallery'
  }
}

function formatDate(value) {
  if (!value) {
    return 'Recent'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatShortDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function getWeekBucket(value) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const day = date.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setUTCDate(date.getUTCDate() + mondayOffset)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)

  return {
    key: start.toISOString().slice(0, 10),
    label: `${formatShortDate(start.toISOString().slice(0, 10))} - ${formatShortDate(end.toISOString().slice(0, 10))}`,
  }
}

function getMonthBucket(value) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const key = value.slice(0, 7)

  return {
    key,
    label: new Intl.DateTimeFormat('en', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date),
  }
}

function isTimeEntryIncomplete(entry) {
  return !entry.editingStartDate || !entry.editingEndDate || Number(entry.totalHours || 0) <= 0
}

function buildTimeDashboardSummary({ clients, entries, isAll, selectedClient }) {
  const scopedClients = clients || []
  const scopedEntries = entries || []
  const clientById = new Map(scopedClients.map((client) => [String(client.id), client]))
  const monthMap = new Map()
  const recurringRevenueKeys = new Set()
  const incompleteBucketMap = new Map()
  let totalHours = 0
  let undatedProjectRevenue = 0
  let incompleteCount = 0

  for (const entry of scopedEntries) {
    const hours = Number(entry.totalHours) || 0
    const projectFee = Number(entry.projectFee) || 0
    const client = clientById.get(String(entry.clientId)) || {
      billingType: entry.clientBillingType,
      monthlyPayment: entry.clientMonthlyPayment,
      monthlyExpectedHours: entry.clientMonthlyExpectedHours,
    }
    const month = getMonthBucket(entry.editingStartDate)
    totalHours += hours

    if (isTimeEntryIncomplete(entry)) {
      incompleteCount += 1
      const bucketKey = month?.key || 'unscheduled'
      const bucket = incompleteBucketMap.get(bucketKey) || {
        key: bucketKey,
        label: month?.label || 'Unscheduled',
        count: 0,
      }
      bucket.count += 1
      incompleteBucketMap.set(bucketKey, bucket)
    }

    if (!month) {
      if (client.billingType === 'project_based') {
        undatedProjectRevenue += projectFee
      }
      continue
    }

    const currentMonth = monthMap.get(month.key) || {
      ...month,
      hours: 0,
      projects: 0,
      revenue: 0,
      incompleteCount: 0,
      effectiveHourlyRate: null,
      overThreshold: false,
      thresholdDelta: 0,
    }

    currentMonth.hours += hours
    currentMonth.projects += 1

    if (isTimeEntryIncomplete(entry)) {
      currentMonth.incompleteCount += 1
    }

    if (client.billingType === 'project_based') {
      currentMonth.revenue += projectFee
    } else {
      const revenueKey = `${client.id || entry.clientId}:${month.key}`

      if (!recurringRevenueKeys.has(revenueKey)) {
        currentMonth.revenue += Number(client.monthlyPayment) || 0
        recurringRevenueKeys.add(revenueKey)
      }
    }

    monthMap.set(month.key, currentMonth)
  }

  const months = [...monthMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((month) => {
      const thresholdHours =
        !isAll && selectedClient?.billingType !== 'project_based'
          ? Number(selectedClient?.monthlyExpectedHours) || 0
          : 0
      const thresholdDelta = thresholdHours ? month.hours - thresholdHours : 0

      return {
        ...month,
        effectiveHourlyRate: month.hours > 0 && month.revenue > 0 ? month.revenue / month.hours : null,
        overThreshold: thresholdHours ? thresholdDelta > 0 : false,
        thresholdDelta,
      }
    })

  const datedRevenue = months.reduce((sum, month) => sum + (Number(month.revenue) || 0), 0)
  const totalRevenue = datedRevenue + undatedProjectRevenue
  const allClientExpectedHours = scopedClients.reduce(
    (sum, client) =>
      sum + (client.billingType === 'project_based' ? 0 : Number(client.monthlyExpectedHours) || 0),
    0,
  )
  const selectedThresholdHours =
    !isAll && selectedClient?.billingType !== 'project_based'
      ? Number(selectedClient.monthlyExpectedHours) || 0
      : allClientExpectedHours

  return {
    id: isAll ? ALL_TIME_CLIENTS_ID : selectedClient?.id,
    name: isAll ? 'All clients' : selectedClient?.name || 'Client',
    billingType: isAll ? 'mixed' : selectedClient?.billingType || 'recurring_monthly',
    monthlyPayment: isAll
      ? scopedClients.reduce((sum, client) => sum + (Number(client.monthlyPayment) || 0), 0)
      : Number(selectedClient?.monthlyPayment) || 0,
    thresholdHours: selectedThresholdHours,
    totalHours,
    totalRevenue,
    projectCount: scopedEntries.length,
    incompleteCount,
    averageEffectiveHourlyRate: totalHours > 0 && totalRevenue > 0 ? totalRevenue / totalHours : null,
    entries: scopedEntries,
    months,
    incompleteBuckets: [...incompleteBucketMap.values()].sort((a, b) => {
      if (a.key === 'unscheduled') return 1
      if (b.key === 'unscheduled') return -1
      return a.key.localeCompare(b.key)
    }),
  }
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(2)} hrs`
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatChartTick(value, unit) {
  if (unit === '$') {
    return formatCurrency(value)
  }

  if (unit === '$/hr') {
    return `${formatCurrency(value)}/hr`
  }

  if (unit === 'count') {
    return `${Number(value || 0).toFixed(0)}`
  }

  return formatHours(value)
}

function destroyTimeChart() {
  if (timeChartInstance) {
    timeChartInstance.destroy()
    timeChartInstance = null
  }
}

async function renderTimeChart() {
  await nextTick()

  if (
    page.value !== 'time-tracker' ||
    !timeChartCanvas.value ||
    !activeTimeChart.value ||
    !activeTimeChartHasData.value
  ) {
    destroyTimeChart()
    return
  }

  destroyTimeChart()

  timeChartInstance = new Chart(timeChartCanvas.value, {
    type: 'bar',
    data: {
      labels: activeTimeChart.value.labels,
      datasets: activeTimeChart.value.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            boxWidth: 12,
            color: '#24191a',
            font: {
              weight: 700,
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatChartTick(context.parsed.y, activeTimeChart.value.unit)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#8b7d80',
            maxRotation: 0,
            autoSkip: true,
            font: {
              weight: 700,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(36, 25, 26, 0.08)',
          },
          ticks: {
            color: '#8b7d80',
            callback(value) {
              return formatChartTick(value, activeTimeChart.value.unit)
            },
          },
        },
      },
    },
  })
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(errorPayload.message || errorPayload.error || `Request failed: ${response.status}`)
  }

  return response.json()
}

async function loadGallery() {
  galleryError.value = ''
  visibleGalleryCount.value = 20

  try {
    galleryItems.value = await fetchJson('/api/gallery')
    galleryStatus.value = galleryItems.value.length
      ? `${galleryItems.value.length} featured files`
      : 'No gallery files yet'
  } catch (error) {
    galleryError.value = `The gallery could not load yet: ${error.message}. Check the Google service account and Drive folder sharing.`
    galleryStatus.value = error.message
  }
}

function loadMoreGalleryItems() {
  if (!hasMoreGalleryItems.value) {
    return
  }

  visibleGalleryCount.value = Math.min(visibleGalleryCount.value + 20, galleryItems.value.length)
}

function handleGalleryScroll() {
  if (page.value !== 'gallery' || !hasMoreGalleryItems.value) {
    return
  }

  const cards = Array.from(document.querySelectorAll('.instagram-card'))
  const triggerCard = cards[Math.max(cards.length - 10, 0)]

  if (!triggerCard) {
    return
  }

  const triggerTop = triggerCard.getBoundingClientRect().top

  if (triggerTop < window.innerHeight + 160) {
    loadMoreGalleryItems()
  }
}

async function loadAuthStatus() {
  authStatus.value = await fetchJson('/api/google/auth/status').catch(() => ({
    loggedIn: false,
    user: null,
  }))
}

async function loadAdminGallery() {
  if (!authStatus.value.loggedIn) {
    return
  }

  adminItems.value = await fetchJson('/api/gallery/admin').catch((error) => {
    saveStatus.value = error.message
    return []
  })
  jobApplications.value = await fetchJson('/api/jobs/applications').catch((error) => {
    careersStatus.value = error.message
    return []
  })

  if (!selectedAdminItemId.value && adminItems.value.length) {
    selectedAdminItemId.value = adminItems.value[0].id
  }

  await loadTimeTracker()
}

async function loadJobs() {
  jobs.value = await fetchJson('/api/jobs').catch(() => [])
}

async function loadTimeTracker() {
  timeTrackerStatus.value = 'Loading time tracker...'

  try {
    timeTracker.value = await fetchJson('/api/time-tracker')
    const hasSelectedClient = timeTracker.value.clients.some(
      (client) => String(client.id) === String(selectedTimeClientId.value),
    )

    if (
      !selectedTimeClientId.value ||
      (selectedTimeClientId.value !== ALL_TIME_CLIENTS_ID && !hasSelectedClient)
    ) {
      selectedTimeClientId.value = ALL_TIME_CLIENTS_ID
    }

    if (
      !timeEntryForm.value.clientId ||
      !timeTracker.value.clients.some((client) => String(client.id) === String(timeEntryForm.value.clientId))
    ) {
      timeEntryForm.value.clientId = selectedTimeClient.value?.id || timeTracker.value.clients[0]?.id || ''
    }

    if (
      selectedTimeMonth.value !== 'all' &&
      !timeMonthOptions.value.some((month) => month.key === selectedTimeMonth.value)
    ) {
      selectedTimeMonth.value = 'all'
    }
    timeTrackerStatus.value = ''
  } catch (error) {
    timeTracker.value = null
    timeTrackerStatus.value = error.message
  }
}

function handleTimeClientSelectionChange() {
  if (selectedTimeClient.value) {
    timeEntryForm.value.clientId = selectedTimeClient.value.id
  } else if (!timeEntryForm.value.clientId) {
    timeEntryForm.value.clientId = timeTrackerClients.value[0]?.id || ''
  }
}

function resetTimeClientForm() {
  timeClientForm.value = {
    id: null,
    name: '',
    billingType: 'recurring_monthly',
    monthlyPayment: 0,
    monthlyExpectedHours: 0,
    targetHourlyRate: 75,
  }
}

function editTimeClient(client) {
  timeClientForm.value = {
    id: client.id,
    name: client.name,
    billingType: client.billingType || 'recurring_monthly',
    monthlyPayment: client.monthlyPayment,
    monthlyExpectedHours: client.monthlyExpectedHours,
    targetHourlyRate: client.targetHourlyRate,
  }
}

async function saveTimeClient() {
  timeSaveStatus.value = timeClientForm.value.id ? 'Updating client...' : 'Adding client...'

  try {
    const isEditing = Boolean(timeClientForm.value.id)
    const saved = await fetchJson(
      isEditing
        ? `/api/time-tracker/clients/${timeClientForm.value.id}`
        : '/api/time-tracker/clients',
      {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(timeClientForm.value),
      },
    )

    selectedTimeClientId.value = saved.id
    timeEntryForm.value.clientId = saved.id
    resetTimeClientForm()
    await loadTimeTracker()
    timeSaveStatus.value = isEditing ? 'Client updated' : 'Client added'
  } catch (error) {
    timeSaveStatus.value = error.message
  }
}

async function removeTimeClient(client) {
  timeSaveStatus.value = `Deleting ${client.name}...`

  try {
    await fetchJson(`/api/time-tracker/clients/${client.id}`, { method: 'DELETE' })
    if (String(selectedTimeClientId.value) === String(client.id)) {
      selectedTimeClientId.value = ALL_TIME_CLIENTS_ID
    }
    resetTimeClientForm()
    resetTimeEntryForm()
    await loadTimeTracker()
    timeSaveStatus.value = 'Client deleted'
  } catch (error) {
    timeSaveStatus.value = error.message
  }
}

function resetTimeEntryForm() {
  timeEntryForm.value = {
    id: null,
    clientId: selectedTimeClient.value?.id || timeTrackerClients.value[0]?.id || '',
    projectName: '',
    editingStartDate: '',
    editingEndDate: '',
    filmingHours: 0,
    drivingHours: 0,
    editingHours: 0,
    projectFee: 0,
    notes: '',
  }
}

function editTimeEntry(entry) {
  editingTimeEntry.value = entry
  timeEntryModalForm.value = {
    id: entry.id,
    clientId: entry.clientId,
    projectName: entry.projectName,
    editingStartDate: entry.editingStartDate,
    editingEndDate: entry.editingEndDate,
    filmingHours: entry.filmingHours,
    drivingHours: entry.drivingHours,
    editingHours: entry.editingHours,
    projectFee: entry.projectFee,
    notes: entry.notes,
  }
}

function closeTimeEntryModal() {
  editingTimeEntry.value = null
  timeEntryModalForm.value = {
    id: null,
    clientId: '',
    projectName: '',
    editingStartDate: '',
    editingEndDate: '',
    filmingHours: 0,
    drivingHours: 0,
    editingHours: 0,
    projectFee: 0,
    notes: '',
  }
}

async function saveTimeEntry() {
  timeSaveStatus.value = timeEntryForm.value.id ? 'Updating entry...' : 'Adding entry...'

  try {
    const isEditing = Boolean(timeEntryForm.value.id)
    await fetchJson(
      isEditing
        ? `/api/time-tracker/entries/${timeEntryForm.value.id}`
        : '/api/time-tracker/entries',
      {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(timeEntryForm.value),
      },
    )

    selectedTimeClientId.value = timeEntryForm.value.clientId
    resetTimeEntryForm()
    await loadTimeTracker()
    timeSaveStatus.value = isEditing ? 'Entry updated' : 'Entry added'
  } catch (error) {
    timeSaveStatus.value = error.message
  }
}

async function saveTimeEntryModal() {
  if (!editingTimeEntry.value?.id) {
    return
  }

  timeSaveStatus.value = 'Updating entry...'

  try {
    await fetchJson(`/api/time-tracker/entries/${editingTimeEntry.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(timeEntryModalForm.value),
    })

    await loadTimeTracker()
    closeTimeEntryModal()
    timeSaveStatus.value = 'Entry updated'
  } catch (error) {
    timeSaveStatus.value = error.message
  }
}

async function removeTimeEntryFromModal() {
  if (!editingTimeEntry.value) {
    return
  }

  const entry = editingTimeEntry.value
  closeTimeEntryModal()
  await removeTimeEntry(entry)
}

async function removeTimeEntry(entry) {
  timeSaveStatus.value = `Deleting ${entry.projectName}...`

  try {
    await fetchJson(`/api/time-tracker/entries/${entry.id}`, { method: 'DELETE' })
    if (timeEntryForm.value.id === entry.id) {
      resetTimeEntryForm()
    }
    await loadTimeTracker()
    timeSaveStatus.value = 'Entry deleted'
  } catch (error) {
    timeSaveStatus.value = error.message
  }
}

function resetJobForm() {
  jobForm.value = { id: null, title: '', description: '' }
  setJobEditorHtml('')
}

function editJob(job) {
  jobForm.value = {
    id: job.id,
    title: job.title,
    description: job.description,
  }
  setJobEditorHtml(job.description)
}

function isJobExpanded(jobId) {
  return expandedJobIds.value.has(jobId)
}

function toggleJob(jobId) {
  const nextExpandedJobs = new Set(expandedJobIds.value)

  if (nextExpandedJobs.has(jobId)) {
    nextExpandedJobs.delete(jobId)
  } else {
    nextExpandedJobs.add(jobId)
  }

  expandedJobIds.value = nextExpandedJobs
}

function setJobEditorHtml(html = '') {
  nextTick(() => {
    if (jobEditor.value) {
      jobEditor.value.innerHTML = html || ''
    }
  })
}

function syncJobDescription() {
  jobForm.value.description = jobEditor.value?.innerHTML || ''
}

function formatJobDescription(command, value = null) {
  jobEditor.value?.focus()
  document.execCommand(command, false, value)
  syncJobDescription()
}

function formatJobBlock(blockName) {
  formatJobDescription('formatBlock', blockName)
}

async function saveJob() {
  careersStatus.value = 'Saving job...'
  syncJobDescription()

  try {
    const isEditing = Boolean(jobForm.value.id)
    const saved = await fetchJson(isEditing ? `/api/jobs/${jobForm.value.id}` : '/api/jobs', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({
        title: jobForm.value.title,
        description: jobForm.value.description,
      }),
    })

    if (isEditing) {
      jobs.value = jobs.value.map((job) => (job.id === saved.id ? saved : job))
    } else {
      jobs.value = [saved, ...jobs.value]
    }

    const storedJobs = await fetchJson('/api/jobs')

    if (!storedJobs.some((job) => job.id === saved.id)) {
      throw new Error('The job could not be confirmed in storage')
    }

    jobs.value = storedJobs
    careersStatus.value = 'Job saved and confirmed in storage'
    resetJobForm()
  } catch (error) {
    careersStatus.value = error.message
  }
}

async function removeJob(job) {
  careersStatus.value = 'Deleting job...'

  try {
    await fetchJson(`/api/jobs/${job.id}`, { method: 'DELETE' })
    jobs.value = jobs.value.filter((entry) => entry.id !== job.id)
    careersStatus.value = 'Job deleted'

    if (jobForm.value.id === job.id) {
      resetJobForm()
    }
  } catch (error) {
    careersStatus.value = error.message
  }
}

async function retryApplicationEmail(application) {
  careersStatus.value = `Retrying email for ${application.name}...`

  try {
    const result = await fetchJson(`/api/jobs/applications/${application.id}/notify`, {
      method: 'POST',
    })
    careersStatus.value = result.message
    await loadAdminGallery()
  } catch (error) {
    careersStatus.value = `Email retry failed: ${error.message}`
    await loadAdminGallery()
  }
}

function resetApplicationForm() {
  applicationForm.value = {
    name: '',
    age: '',
    city: '',
    state: '',
    instagram: '',
    tiktok: '',
    resume_name: '',
    resume_type: '',
    resume_data_url: '',
  }
}

function openApplication(job) {
  selectedJob.value = job
  applicationStatus.value = { type: '', message: '' }
  resetApplicationForm()
}

function closeApplication() {
  selectedJob.value = null
  resetApplicationForm()
}

function handleResumeUpload(event) {
  const [file] = event.target.files || []

  if (!file) {
    return
  }

  const acceptedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg'])

  if (!acceptedTypes.has(file.type)) {
    applicationStatus.value = {
      type: 'error',
      message: 'Resume must be a PDF, PNG, JPG, or JPEG file.',
    }
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    applicationStatus.value = {
      type: 'error',
      message: 'Resume must be 5 MB or smaller.',
    }
    event.target.value = ''
    return
  }

  applicationStatus.value = { type: '', message: '' }
  const reader = new FileReader()
  reader.onload = () => {
    applicationForm.value = {
      ...applicationForm.value,
      resume_name: file.name,
      resume_type: file.type,
      resume_data_url: reader.result,
    }
  }
  reader.readAsDataURL(file)
}

async function submitApplication() {
  if (!selectedJob.value) {
    return
  }

  if (!applicationForm.value.resume_data_url) {
    applicationStatus.value = { type: 'error', message: 'Please upload your resume.' }
    return
  }

  applicationSubmitting.value = true
  applicationStatus.value = { type: 'loading', message: 'Submitting your application...' }

  try {
    const result = await fetchJson(`/api/jobs/${selectedJob.value.id}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationForm.value),
    })
    applicationStatus.value = {
      type: result.notification_sent === false ? 'warning' : 'success',
      message: result.message || 'Your application was submitted successfully.',
    }
    await loadAdminGallery()
    resetApplicationForm()
  } catch (error) {
    applicationStatus.value = {
      type: 'error',
      message: `There was a problem submitting your application: ${error.message}`,
    }
  } finally {
    applicationSubmitting.value = false
  }
}

function isVideo(item) {
  return item?.media_type === 'VIDEO'
}

function openGalleryItem(item) {
  selectedGalleryItem.value = item

  if (isVideo(item)) {
    markMediaLoading(item.id)
  }
}

function closeGalleryItem() {
  if (selectedGalleryItem.value) {
    markMediaReady(selectedGalleryItem.value.id)
  }

  selectedGalleryItem.value = null
}

function getThumbnail(item) {
  return item?.thumbnail_url || ''
}

function getMediaStyle(item) {
  return {
    '--media-aspect-ratio': item?.aspect_ratio || '1 / 1',
  }
}

function handleGalleryImageError(event) {
  event.target.src = '/sample-instagram-aerial.png'
}

function markMediaLoading(id) {
  loadingMediaIds.value = new Set([...loadingMediaIds.value, id])
}

function markMediaReady(id) {
  const next = new Set(loadingMediaIds.value)
  next.delete(id)
  loadingMediaIds.value = next
}

function isMediaLoading(id) {
  return loadingMediaIds.value.has(id)
}

function onDragStart(item) {
  draggedItemId.value = item.id
}

async function onDrop(targetItem) {
  const fromIndex = adminItems.value.findIndex((item) => item.id === draggedItemId.value)
  const toIndex = adminItems.value.findIndex((item) => item.id === targetItem.id)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    draggedItemId.value = ''
    return
  }

  const nextItems = [...adminItems.value]
  const [moved] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, moved)
  adminItems.value = nextItems
  draggedItemId.value = ''
  await saveOrder()
}

async function saveOrder() {
  saveStatus.value = 'Saving order...'

  try {
    await fetchJson('/api/gallery/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids: adminItems.value.map((item) => item.id) }),
    })
    saveStatus.value = 'Order saved'
    await loadGallery()
  } catch (error) {
    saveStatus.value = error.message
  }
}

async function saveAdminItem(item, updates) {
  saveStatus.value = 'Saving...'

  try {
    const updated = await fetchJson(`/api/gallery/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const index = adminItems.value.findIndex((entry) => entry.id === item.id)

    if (index >= 0) {
      adminItems.value[index] = { ...adminItems.value[index], ...updated }
    }

    saveStatus.value = 'Saved'
    await loadGallery()
  } catch (error) {
    saveStatus.value = error.message
  }
}

async function captureThumbnail(item) {
  const video = document.querySelector(`#admin-video-${CSS.escape(item.id)}`)

  if (!video || !video.videoWidth) {
    saveStatus.value = 'Load and scrub the video first, then capture.'
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  await saveAdminItem(item, {
    thumbnail_data_url: canvas.toDataURL('image/jpeg', 0.82),
  })
}

function uploadThumbnail(item, event) {
  const [file] = event.target.files || []

  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    await saveAdminItem(item, {
      thumbnail_data_url: reader.result,
    })
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

onMounted(() => {
  normalizeRoute()
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('scroll', handleGalleryScroll, { passive: true })
  loadGallery()
  loadJobs()
  loadAuthStatus().then(loadAdminGallery)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('scroll', handleGalleryScroll)
  destroyTimeChart()
})

watch(timeChartSignature, renderTimeChart)
</script>

<template>
  <header class="site-header">
    <button class="brand" type="button" @click="navigate('/')">
      <span class="brand-mark">
        <img :src="logoImage" alt="" />
      </span>
      <span>
        <strong>The Knoxville Drone Guy</strong>
        <small>Aerial media for East Tennessee</small>
      </span>
    </button>

    <nav class="nav-links" aria-label="Main navigation">
      <button :class="{ active: page === 'home' }" type="button" @click="navigate('/')">Home</button>
      <button :class="{ active: page === 'gallery' }" type="button" @click="navigate('/gallery')">
        Gallery
      </button>
      <button
        v-if="authStatus.loggedIn"
        :class="{ active: page === 'login' }"
        type="button"
        @click="navigate('/login')"
      >
        Edit Gallery
      </button>
      <button
        v-if="authStatus.loggedIn"
        :class="{ active: page === 'time-tracker' }"
        type="button"
        @click="navigate('/time-tracker')"
      >
        Time Tracker
      </button>
      <a v-if="authStatus.loggedIn" class="logout-link" href="/api/google/auth/logout">Log out</a>
    </nav>
  </header>

  <main>
    <section v-if="page === 'home'" class="home-page">
      <section class="hero-section">
        <div class="hero-copy">
          <img class="hero-logo" :src="logoImage" alt="The Knoxville Drone Guy logo" />
          <p class="eyebrow">Drone & Ground photo, video, mapping, and inspections</p>
          <h1>The Knoxville Drone Guy</h1>
          <p class="hero-lede">
            Helping Knoxville businesses, properties and brands stand out with professional drone and ground videos and photos.
          </p>

          <div class="hero-actions">
            <a :href="bookingHref" class="primary-action">Book Now</a>
            <button class="secondary-action" type="button" @click="navigate('/gallery')">
              View recent work
            </button>
          </div>
        </div>

        <div class="hero-media">
          <img :src="heroImage" alt="The Knoxville Drone Guy preparing drone gear on location" />
        </div>
      </section>

      <section class="stats-band" aria-label="Service highlights">
        <article
          v-for="stat in featuredStats"
          :key="stat.title"
          class="stat-item"
          :class="stat.theme"
        >
          <span class="stat-icon" :class="stat.iconClass" aria-hidden="true">{{ stat.icon }}</span>
          <h2>{{ stat.title }}</h2>
          <span class="stat-rule"></span>
          <p>{{ stat.description }}</p>
        </article>
      </section>

      <section class="services-section">
        <div class="services-heading">
          <p class="services-kicker"><span></span>Drone Services<span></span></p>
          <h2>
            Aerial visuals that <strong>elevate every project</strong>
          </h2>
          <p>
            Professional drone photography and videography tailored to real estate, construction,
            businesses, and brands across East Tennessee.
          </p>
        </div>

        <div class="service-grid">
          <article
            v-for="service in services"
            :key="service.name"
            class="service-card"
            :style="{ backgroundImage: `url(${service.image})` }"
          >
            <div class="service-card-content">
              <span class="service-icon" :class="service.iconClass" aria-hidden="true">{{ service.icon }}</span>
              <h3>{{ service.name }}</h3>
              <span class="service-rule"></span>
              <p>{{ service.description }}</p>
            </div>
          </article>

          <article class="service-card service-card-wide" :style="{ backgroundImage: `url(${tourService.image})` }">
            <div class="service-card-content">
              <span class="service-icon service-icon-text" aria-hidden="true">{{ tourService.icon }}</span>
              <h3>{{ tourService.name }}</h3>
              <span class="service-rule"></span>
              <p>{{ tourService.description }}</p>
            </div>

            <div class="tour-feature-row" aria-label="360 tour features">
              <div v-for="feature in tourFeatures" :key="feature.title" class="tour-feature">
                <span :class="feature.iconClass" aria-hidden="true">{{ feature.icon }}</span>
                <strong>{{ feature.title }}</strong>
                <small>{{ feature.label }}</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="cta-band">
        <div>
          <p class="eyebrow">Knoxville based</p>
          <h2>Need aerial footage this week?</h2>
        </div>
        <div class="cta-actions">
          <a :href="`tel:${phoneNumber}`" class="primary-action">Call now</a>
          <a :href="`sms:${phoneNumber}`" class="secondary-action">Text Now</a>
        </div>
      </section>
    </section>

    <section v-else-if="page === 'gallery'" class="instagram-page">
      <section class="page-title">
        <p class="eyebrow">Media Portfolio</p>
        <h1>Project Gallery</h1>
        <p>
          A curated set of recent Knoxville Drone Guy videos, photos and behind the scenes.
        </p>
      </section>

      <section class="feed-toolbar" aria-label="Project gallery source">
        <a class="primary-action" :href="bookingHref">Book Now</a>
      </section>

      <p v-if="galleryError" class="feed-error">{{ galleryError }}</p>

      <section class="instagram-grid" aria-label="Google Drive project media">
        <article v-for="item in visibleGalleryItems" :key="item.id" class="instagram-card">
          <button class="media-button" type="button" :style="getMediaStyle(item)" @click="openGalleryItem(item)">
            <img
              v-if="getThumbnail(item)"
              :src="getThumbnail(item)"
              :alt="`${item.title} project media`"
              loading="lazy"
              @error="handleGalleryImageError"
            />
            <span v-else-if="isVideo(item)" class="media-placeholder">
              <span class="placeholder-title">{{ item.title }}</span>
              <span class="placeholder-hint">Video loads on play</span>
            </span>
            <img
              v-else
              :src="item.media_url"
              :alt="`${item.title} project media`"
              loading="lazy"
              @error="handleGalleryImageError"
            />
            <span v-if="isVideo(item)" class="play-icon" aria-hidden="true"></span>
            <span class="media-type">{{ item.media_type }}</span>
          </button>
          <div>
            <time :datetime="item.timestamp">{{ formatDate(item.timestamp) }}</time>
            <p>{{ item.title }}</p>
          </div>
        </article>
      </section>

      <p v-if="hasMoreGalleryItems" class="gallery-load-more" aria-live="polite">
        Loading more work...
      </p>

      <section
        v-if="selectedGalleryItem"
        class="media-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedGalleryItem.title"
        @click.self="closeGalleryItem"
      >
        <div class="media-viewer-panel">
          <div class="media-viewer-header">
            <div>
              <strong>{{ selectedGalleryItem.title }}</strong>
              <span>{{ formatDate(selectedGalleryItem.timestamp) }}</span>
            </div>
            <button class="secondary-action compact" type="button" @click="closeGalleryItem">
              Close
            </button>
          </div>

          <div class="viewer-media-frame">
            <template v-if="isVideo(selectedGalleryItem)">
              <video
                :key="selectedGalleryItem.id"
                :src="selectedGalleryItem.media_url"
                :poster="getThumbnail(selectedGalleryItem) || undefined"
                controls
                autoplay
                playsinline
                preload="auto"
                @loadstart="markMediaLoading(selectedGalleryItem.id)"
                @waiting="markMediaLoading(selectedGalleryItem.id)"
                @loadeddata="markMediaReady(selectedGalleryItem.id)"
                @canplay="markMediaReady(selectedGalleryItem.id)"
                @playing="markMediaReady(selectedGalleryItem.id)"
                @error="markMediaReady(selectedGalleryItem.id)"
              ></video>
              <span v-if="isMediaLoading(selectedGalleryItem.id)" class="viewer-loading">
                Loading video...
              </span>
            </template>
            <img
              v-else
              :src="selectedGalleryItem.media_url"
              :alt="selectedGalleryItem.title"
              @error="handleGalleryImageError"
            />
          </div>
        </div>
      </section>

      <section class="integration-note subtle-note">
        <a class="primary-action" :href="bookingHref">Book Now</a>
      </section>
    </section>

    <section v-else-if="page === 'login'" class="login-page">
      <section class="page-title">
        <p class="eyebrow">Private studio</p>
        <h1>Gallery editor</h1>
        <p>
          Sign in with Google to manage the gallery, rearrange media, and pick custom video
          thumbnails.
        </p>
      </section>

      <section v-if="!authStatus.loggedIn" class="integration-note">
        <h2>Google login required</h2>
        <p>
          This confirms your admin identity. The public gallery media is read by the server through
          a Google service account.
        </p>
        <p v-if="loginError" class="auth-error">{{ loginError }}</p>
        <div class="hero-actions">
          <a class="primary-action" href="/api/google/auth/start">Sign in with Google</a>
        </div>
      </section>

      <section v-else class="admin-layout">
        <aside class="admin-list" aria-label="Gallery order">
          <div class="admin-list-header">
            <div>
              <strong>{{ authStatus.user?.email }}</strong>
              <span>{{ saveStatus || 'Drag items to rearrange the gallery.' }}</span>
            </div>
            <a class="secondary-action compact" href="/api/google/auth/logout">Log out</a>
          </div>

          <article
            v-for="item in adminItems"
            :key="item.id"
            class="admin-row"
            :class="{ selected: selectedAdminItemId === item.id }"
            draggable="true"
            @dragstart="onDragStart(item)"
            @dragover.prevent
            @drop="onDrop(item)"
            @click="selectedAdminItemId = item.id"
          >
            <span class="drag-handle">::</span>
            <img
              v-if="item.thumbnail_url"
              :src="item.thumbnail_url"
              :alt="`${item.title} thumbnail`"
              @error="handleGalleryImageError"
            />
            <span v-else-if="isVideo(item)" class="admin-thumb-placeholder">VIDEO</span>
            <img
              v-else
              :src="item.media_url"
              :alt="`${item.title} thumbnail`"
              @error="handleGalleryImageError"
            />
            <span>{{ item.title }}</span>
          </article>
        </aside>

        <section v-if="selectedAdminItem" class="admin-editor">
          <label>
            Title
            <input
              :value="selectedAdminItem.title"
              @change="saveAdminItem(selectedAdminItem, { title: $event.target.value })"
            />
          </label>

          <label class="toggle-row">
            <input
              type="checkbox"
              :checked="selectedAdminItem.hidden"
              @change="saveAdminItem(selectedAdminItem, { hidden: $event.target.checked })"
            />
            Hide from public gallery
          </label>

          <video
            v-if="isVideo(selectedAdminItem)"
            :id="`admin-video-${selectedAdminItem.id}`"
            class="admin-video"
            :src="selectedAdminItem.media_url"
            controls
            playsinline
            preload="auto"
            @loadstart="markMediaLoading(selectedAdminItem.id)"
            @loadeddata="markMediaReady(selectedAdminItem.id)"
            @canplay="markMediaReady(selectedAdminItem.id)"
            @error="markMediaReady(selectedAdminItem.id)"
          ></video>
          <span v-if="isVideo(selectedAdminItem) && isMediaLoading(selectedAdminItem.id)" class="admin-loading">
            Loading video for thumbnail selection...
          </span>

          <img
            v-else
            class="admin-video"
            :src="selectedAdminItem.media_url"
            :alt="selectedAdminItem.title"
          />

          <div class="hero-actions">
            <button
              v-if="isVideo(selectedAdminItem)"
              class="primary-action"
              type="button"
              @click="captureThumbnail(selectedAdminItem)"
            >
              Use current frame as thumbnail
            </button>
            <button
              class="secondary-action"
              type="button"
              @click="saveAdminItem(selectedAdminItem, { thumbnail_data_url: '' })"
            >
              Reset thumbnail
            </button>
            <label class="upload-action">
              Upload thumbnail
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="uploadThumbnail(selectedAdminItem, $event)"
              />
            </label>
          </div>
        </section>
      </section>
    </section>

    <section v-if="page === 'time-tracker'" class="time-tracker-page">
      <section class="page-title">
        <p class="eyebrow">Private dashboard</p>
        <h1>Time Tracker</h1>
        <p>
          Track client hours, project fees, recurring retainers, and weekly workload in one place.
        </p>
      </section>

      <section v-if="!authStatus.loggedIn" class="integration-note time-login-note">
        <h2>Admin login required</h2>
        <p>Sign in to view the private time tracker and client pay math.</p>
        <div class="hero-actions">
          <a class="primary-action" href="/api/google/auth/start">Sign in with Google</a>
        </div>
      </section>

      <section v-else-if="timeTrackerStatus" class="integration-note time-login-note">
        <h2>Tracker status</h2>
        <p>{{ timeTrackerStatus }}</p>
      </section>

      <section v-else-if="timeTrackerClients.length" class="time-dashboard">
        <section class="time-admin-grid">
          <form
            class="time-admin-panel"
            :class="{ 'is-collapsed': !isTimeClientPanelOpen }"
            @submit.prevent="saveTimeClient"
          >
            <div class="time-panel-header">
              <div>
                <p class="eyebrow">Clients</p>
                <h2>{{ timeClientForm.id ? 'Edit client' : 'Add client' }}</h2>
                <p>{{ timeSaveStatus || 'Create recurring monthly clients or one-off project clients.' }}</p>
              </div>
              <button
                class="time-panel-toggle"
                type="button"
                :aria-expanded="isTimeClientPanelOpen"
                :aria-label="isTimeClientPanelOpen ? 'Collapse client form' : 'Expand client form'"
                @click="isTimeClientPanelOpen = !isTimeClientPanelOpen"
              >
                <span aria-hidden="true">{{ isTimeClientPanelOpen ? '⌄' : '+' }}</span>
              </button>
            </div>
            <div v-show="isTimeClientPanelOpen" class="time-panel-body">
              <div class="time-active-client">
                <label>
                  Active dashboard client
                  <select
                    v-model="selectedTimeClientId"
                    @change="handleTimeClientSelectionChange"
                  >
                    <option :value="ALL_TIME_CLIENTS_ID">All clients</option>
                    <option v-for="client in timeTrackerClients" :key="client.id" :value="client.id">
                      {{ client.name }}
                    </option>
                  </select>
                </label>
                <div class="time-client-actions">
                  <button
                    class="secondary-action compact"
                    type="button"
                    :disabled="!selectedTimeClient"
                    @click="editTimeClient(selectedTimeClient)"
                  >
                    Edit active client
                  </button>
                  <button class="secondary-action compact" type="button" @click="resetTimeClientForm">
                    New client
                  </button>
                  <button
                    v-if="selectedTimeClient && timeTrackerClients.length > 1"
                    class="secondary-action compact danger-action"
                    type="button"
                    @click="removeTimeClient(selectedTimeClient)"
                  >
                    Delete active client
                  </button>
                </div>
              </div>
              <label>
                Client name
                <input v-model="timeClientForm.name" required />
              </label>
              <label class="toggle-row">
                <input
                  v-model="timeClientForm.billingType"
                  type="checkbox"
                  true-value="recurring_monthly"
                  false-value="project_based"
                />
                Recurring monthly client?
              </label>
              <div v-if="isTimeClientRecurring" class="time-form-row">
                <label>
                  Monthly payment
                  <input v-model.number="timeClientForm.monthlyPayment" min="0" step="0.01" type="number" />
                </label>
                <label>
                  Expected monthly hours
                  <input v-model.number="timeClientForm.monthlyExpectedHours" min="0.25" step="0.25" type="number" />
                </label>
              </div>
              <p v-else class="time-field-note">
                Project-based clients use a flat project fee on each project entry.
              </p>
              <div class="hero-actions">
                <button class="primary-action" type="submit">Save client</button>
                <button class="secondary-action" type="button" @click="resetTimeClientForm">Clear</button>
              </div>
            </div>
          </form>

          <form
            class="time-admin-panel"
            :class="{ 'is-collapsed': !isTimeProjectPanelOpen }"
            @submit.prevent="saveTimeEntry"
          >
            <div class="time-panel-header">
              <div>
                <p class="eyebrow">Projects</p>
                <h2>{{ timeEntryForm.id ? 'Edit project hours' : 'Add project hours' }}</h2>
                <p>Log pay, filming, driving, editing, dates, and notes for any client. Drafts can be saved without dates.</p>
              </div>
              <button
                class="time-panel-toggle"
                type="button"
                :aria-expanded="isTimeProjectPanelOpen"
                :aria-label="isTimeProjectPanelOpen ? 'Collapse project form' : 'Expand project form'"
                @click="isTimeProjectPanelOpen = !isTimeProjectPanelOpen"
              >
                <span aria-hidden="true">{{ isTimeProjectPanelOpen ? '⌄' : '+' }}</span>
              </button>
            </div>
            <div v-show="isTimeProjectPanelOpen" class="time-panel-body">
              <label>
                Client
                <select v-model="timeEntryForm.clientId" required>
                  <option v-for="client in timeTrackerClients" :key="client.id" :value="client.id">
                    {{ client.name }}
                  </option>
                </select>
              </label>
              <label>
                Project or video name
                <input v-model="timeEntryForm.projectName" required />
              </label>
              <div class="time-form-row">
                <label>
                  Start date
                  <input v-model="timeEntryForm.editingStartDate" type="date" />
                </label>
                <label>
                  End date
                  <input v-model="timeEntryForm.editingEndDate" type="date" />
                </label>
              </div>
              <div class="time-form-row three">
                <label>
                  Filming
                  <input v-model.number="timeEntryForm.filmingHours" min="0" step="0.25" type="number" />
                </label>
                <label>
                  Driving
                  <input v-model.number="timeEntryForm.drivingHours" min="0" step="0.25" type="number" />
                </label>
                <label>
                  Editing
                  <input v-model.number="timeEntryForm.editingHours" min="0" step="0.25" type="number" />
                </label>
              </div>
              <label v-if="isSelectedEntryClientProjectBased">
                Project fee
                <input v-model.number="timeEntryForm.projectFee" min="0" step="0.01" type="number" />
              </label>
              <label>
                Notes
                <textarea v-model="timeEntryForm.notes" rows="3"></textarea>
              </label>
              <div class="hero-actions">
                <button class="primary-action" type="submit">Save project</button>
                <button class="secondary-action" type="button" @click="resetTimeEntryForm">Clear</button>
              </div>
            </div>
          </form>
        </section>

        <section class="time-dashboard-controls" aria-label="Time tracker filters">
          <label>
            Dashboard
            <select v-model="selectedTimeClientId" @change="handleTimeClientSelectionChange">
              <option :value="ALL_TIME_CLIENTS_ID">All clients</option>
              <option v-for="client in timeTrackerClients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </label>
          <label>
            Month
            <select v-model="selectedTimeMonth">
              <option value="all">All months</option>
              <option v-for="month in timeMonthOptions" :key="month.key" :value="month.key">
                {{ month.label }}
              </option>
            </select>
          </label>
        </section>

        <div class="time-summary-grid">
          <article v-if="isAllTimeClientsSelected" class="time-summary-card is-featured">
            <span>All client income</span>
            <strong>{{ formatCurrency(timeTrackerSummary.totalRevenue) }}</strong>
            <p>Combined recurring retainers and project fees for the selected period.</p>
          </article>
          <article v-else-if="isSelectedTimeClientRecurring" class="time-summary-card is-featured">
            <span>Expected monthly hours</span>
            <strong>{{ formatHours(timeTrackerSummary.thresholdHours) }} per month</strong>
            <p>
              Based on {{ formatCurrency(timeTrackerSummary.monthlyPayment) }} per month for
              {{ timeTrackerSummary.name }}.
            </p>
          </article>
          <article v-else class="time-summary-card is-featured">
            <span>Total project revenue</span>
            <strong>{{ formatCurrency(timeTrackerSummary.totalRevenue) }}</strong>
            <p>
              Flat project fees logged for {{ timeTrackerSummary.name }}.
            </p>
          </article>
          <article class="time-summary-card">
            <span>Total {{ timeTrackerSummary.name }} hours</span>
            <strong>{{ formatHours(timeTrackerSummary.totalHours) }}</strong>
            <p>{{ timeTrackerSummary.projectCount || 0 }} logged project entries.</p>
          </article>
          <article class="time-summary-card">
            <span>Average effective rate</span>
            <strong>{{ formatCurrency(timeTrackerSummary.averageEffectiveHourlyRate) }}/hr</strong>
            <p>
              {{ isSelectedTimeClientRecurring ? 'Across months with logged work.' : 'Across project fees and logged hours.' }}
            </p>
          </article>
          <article class="time-summary-card">
            <span>Highest month</span>
            <strong>{{ peakTrackerMonth ? formatHours(peakTrackerMonth.hours) : '--' }}</strong>
            <p>{{ peakTrackerMonth?.label || 'No month logged yet' }}</p>
          </article>
          <article class="time-summary-card">
            <span>Average weekly hours</span>
            <strong>{{ formatHours(averageWeeklyHours) }}</strong>
            <p>Average across weeks with logged work.</p>
          </article>
          <article class="time-summary-card">
            <span>Highest week</span>
            <strong>{{ peakTrackerWeek ? formatHours(peakTrackerWeek.hours) : '--' }}</strong>
            <p>{{ peakTrackerWeek?.label || 'No week logged yet' }}</p>
          </article>
          <article class="time-summary-card">
            <span>Incomplete entries</span>
            <strong>{{ timeTrackerSummary.incompleteCount || 0 }}</strong>
            <p>Draft rows missing dates or logged hours.</p>
          </article>
        </div>

        <section class="time-insight-band">
          <div>
            <p class="eyebrow">What this means</p>
            <h2>
              <template v-if="isSelectedTimeClientRecurring">
                The {{ formatHours(timeTrackerSummary.thresholdHours) }} target is per month.
              </template>
              <template v-else-if="isAllTimeClientsSelected">
                This dashboard combines every client and highlights unfinished work.
              </template>
              <template v-else>
                Project fees drive this client’s effective hourly rate.
              </template>
            </h2>
          </div>
          <p v-if="isSelectedTimeClientRecurring">
            {{ overThresholdMonths.length }} month{{ overThresholdMonths.length === 1 ? '' : 's' }}
            are over the target. The dashboard assigns work to the month of the editing start date,
            so cross-month projects count in the month they started.
          </p>
          <p v-else-if="isAllTimeClientsSelected">
            Use the client and month filters to drill into a specific account or period. Draft rows stay visible so
            unfinished work does not quietly disappear from your totals.
          </p>
          <p v-else>
            Each project uses its flat fee divided by logged filming, driving, and editing hours.
            Weekly and monthly charts stay scoped to the active client.
          </p>
        </section>

        <section class="time-chart-card" aria-label="Time tracker charts">
          <div class="time-table-heading">
            <div>
              <p class="eyebrow">Charts</p>
              <h2>{{ activeTimeChart.title }}</h2>
            </div>
            <p>{{ activeTimeChart.helper }}</p>
          </div>
          <div class="time-chart-tabs" role="tablist" aria-label="Time tracker chart tabs">
            <button
              v-for="tab in timeChartTabs"
              :key="tab.id"
              class="time-chart-tab"
              :class="{ active: activeTimeChartTab === tab.id }"
              type="button"
              role="tab"
              :aria-selected="activeTimeChartTab === tab.id"
              @click="activeTimeChartTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="time-chart-canvas-wrap">
            <canvas v-show="activeTimeChartHasData" ref="timeChartCanvas"></canvas>
            <p v-if="!activeTimeChartHasData" class="empty-chart-note">
              Add more project entries to see this chart.
            </p>
          </div>
          <div v-if="weeklyTrackerHours.length" class="time-week-chart">
            <article v-for="week in weeklyTrackerHours" :key="week.key" class="time-week-row">
              <div class="time-week-label">
                <strong>{{ week.label }}</strong>
                <span>{{ week.projects }} project{{ week.projects === 1 ? '' : 's' }}</span>
              </div>
              <div class="time-week-bar-track">
                <span
                  class="time-week-bar"
                  :style="{ width: `${maxWeeklyHours ? Math.max((week.hours / maxWeeklyHours) * 100, 4) : 0}%` }"
                ></span>
              </div>
              <strong class="time-week-hours">{{ formatHours(week.hours) }}</strong>
            </article>
          </div>
          <p v-else class="empty-chart-note">No weekly hours logged yet.</p>
        </section>

        <section class="time-months" aria-label="Monthly client hours">
          <article
            v-for="month in timeTrackerSummary.months"
            :key="month.key"
            class="time-month-card"
            :class="{ 'is-over': month.overThreshold }"
          >
            <div class="time-month-header">
              <div>
                <h3>{{ month.label }}</h3>
                <span>{{ month.projects }} project{{ month.projects === 1 ? '' : 's' }}</span>
              </div>
              <strong>{{ formatCurrency(month.effectiveHourlyRate) }}/hr</strong>
            </div>
            <div class="time-bar-track" aria-hidden="true">
              <span
                class="time-bar"
                :style="{
                  width: `${
                    isSelectedTimeClientRecurring && timeTrackerSummary.thresholdHours
                      ? Math.min((month.hours / timeTrackerSummary.thresholdHours) * 100, 100)
                      : peakTrackerMonth?.hours
                        ? Math.max((month.hours / peakTrackerMonth.hours) * 100, 4)
                        : 0
                  }%`,
                }"
              ></span>
            </div>
            <p>
              {{ formatHours(month.hours) }}
              <span v-if="isSelectedTimeClientRecurring && month.overThreshold">
                , {{ formatHours(month.thresholdDelta) }} over target
              </span>
              <span v-else-if="isSelectedTimeClientRecurring">
                , {{ formatHours(Math.abs(month.thresholdDelta)) }} under target
              </span>
              <span v-else>
                , {{ formatCurrency(month.revenue) }} revenue
              </span>
            </p>
          </article>
        </section>

        <section class="time-table-wrap" aria-label="Client project entries">
          <div class="time-table-heading">
            <div>
              <p class="eyebrow">Source entries</p>
              <h2>{{ timeTrackerSummary.name }} projects</h2>
            </div>
            <p>Entries are stored in the site database and update this dashboard automatically.</p>
          </div>
          <div class="time-table-scroll">
            <table class="time-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Filming</th>
                  <th>Driving</th>
                  <th>Editing</th>
                  <th>Total</th>
                  <th v-if="shouldShowTimeMoneyColumns">Fee</th>
                  <th v-if="shouldShowTimeMoneyColumns">Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in timeTrackerSummary.entries" :key="entry.id">
                  <td>
                    <strong>{{ entry.projectName }}</strong>
                    <span v-if="isAllTimeClientsSelected">{{ entry.clientName }}</span>
                    <span v-if="entry.notes">{{ entry.notes }}</span>
                  </td>
                  <td :class="{ 'is-incomplete-cell': !entry.editingStartDate }">
                    {{ formatShortDate(entry.editingStartDate) || 'Missing' }}
                    <small v-if="!entry.editingStartDate">Needs date</small>
                  </td>
                  <td :class="{ 'is-incomplete-cell': !entry.editingEndDate }">
                    {{ formatShortDate(entry.editingEndDate) || 'Missing' }}
                    <small v-if="!entry.editingEndDate">Needs date</small>
                  </td>
                  <td>{{ formatHours(entry.filmingHours) }}</td>
                  <td>{{ formatHours(entry.drivingHours) }}</td>
                  <td>{{ formatHours(entry.editingHours) }}</td>
                  <td :class="{ 'is-incomplete-cell': Number(entry.totalHours || 0) <= 0 }">
                    {{ formatHours(entry.totalHours) }}
                    <small v-if="Number(entry.totalHours || 0) <= 0">Needs hours</small>
                  </td>
                  <td v-if="shouldShowTimeMoneyColumns">{{ formatCurrency(entry.projectFee) }}</td>
                  <td v-if="shouldShowTimeMoneyColumns">
                    {{ entry.effectiveHourlyRate ? `${formatCurrency(entry.effectiveHourlyRate)}/hr` : '--' }}
                  </td>
                  <td>
                    <div class="time-row-actions">
                      <button class="secondary-action compact" type="button" @click="editTimeEntry(entry)">
                        Edit
                      </button>
                      <button
                        class="secondary-action compact danger-action"
                        type="button"
                        @click="removeTimeEntry(entry)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!timeTrackerSummary.entries?.length">
                  <td :colspan="shouldShowTimeMoneyColumns ? 10 : 8">No project entries for this view yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="editingTimeEntry"
          class="time-entry-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-entry-modal-title"
          @click.self="closeTimeEntryModal"
        >
          <form class="time-entry-modal-panel" @submit.prevent="saveTimeEntryModal">
            <div class="time-entry-modal-header">
              <div>
                <p class="eyebrow">Edit project</p>
                <h2 id="time-entry-modal-title">Project hours</h2>
              </div>
              <button class="secondary-action compact" type="button" @click="closeTimeEntryModal">
                Cancel
              </button>
            </div>
            <label>
              Client
              <select v-model="timeEntryModalForm.clientId" required>
                <option v-for="client in timeTrackerClients" :key="client.id" :value="client.id">
                  {{ client.name }}
                </option>
              </select>
            </label>
            <label>
              Project or video name
              <input v-model="timeEntryModalForm.projectName" required />
            </label>
            <div class="time-form-row">
              <label>
                Start date
                <input v-model="timeEntryModalForm.editingStartDate" type="date" />
              </label>
              <label>
                End date
                <input v-model="timeEntryModalForm.editingEndDate" type="date" />
              </label>
            </div>
            <div class="time-form-row three">
              <label>
                Filming
                <input v-model.number="timeEntryModalForm.filmingHours" min="0" step="0.25" type="number" />
              </label>
              <label>
                Driving
                <input v-model.number="timeEntryModalForm.drivingHours" min="0" step="0.25" type="number" />
              </label>
              <label>
                Editing
                <input v-model.number="timeEntryModalForm.editingHours" min="0" step="0.25" type="number" />
              </label>
            </div>
            <label v-if="isModalEntryClientProjectBased">
              Project fee
              <input v-model.number="timeEntryModalForm.projectFee" min="0" step="0.01" type="number" />
            </label>
            <label>
              Notes
              <textarea v-model="timeEntryModalForm.notes" rows="3"></textarea>
            </label>
            <div class="hero-actions">
              <button class="primary-action" type="submit">Save changes</button>
              <button class="secondary-action danger-action" type="button" @click="removeTimeEntryFromModal">
                Delete entry
              </button>
            </div>
          </form>
        </section>
      </section>

      <section v-else class="integration-note time-login-note">
        <h2>No clients yet</h2>
        <p>Add your first client to start tracking project hours.</p>
      </section>
    </section>

    <section v-if="page === 'careers'" class="careers-page">
      <section class="page-title">
        <p class="eyebrow">Work With Us</p>
        <h1>Careers</h1>
        <p>Join The Knoxville Drone Guy on shoots, edits, creative projects, and local media work.</p>
      </section>

      <section v-if="authStatus.loggedIn" class="job-admin-panel">
        <div>
          <p class="eyebrow">Admin</p>
          <h2>{{ jobForm.id ? 'Edit job post' : 'Add a job post' }}</h2>
          <p>{{ careersStatus || 'Create openings that applicants can apply for from this page.' }}</p>
        </div>
        <form class="job-form" @submit.prevent="saveJob">
          <label>
            Position title
            <input v-model="jobForm.title" required />
          </label>
          <div class="rich-editor-field">
            <span>Description</span>
            <div class="rich-editor-toolbar" aria-label="Job description formatting controls">
              <button type="button" @click="formatJobDescription('bold')">B</button>
              <button type="button" @click="formatJobDescription('italic')">I</button>
              <button type="button" @click="formatJobDescription('insertUnorderedList')">Bullets</button>
              <button type="button" @click="formatJobDescription('insertOrderedList')">Numbers</button>
              <button type="button" @click="formatJobBlock('p')">Paragraph</button>
              <button type="button" @click="formatJobBlock('h3')">Heading</button>
              <button
                v-for="color in richTextColors"
                :key="color.value"
                class="color-swatch"
                type="button"
                :style="{ '--swatch-color': color.value }"
                :aria-label="`Set text color to ${color.name}`"
                @click="formatJobDescription('foreColor', color.value)"
              />
            </div>
            <div
              ref="jobEditor"
              class="rich-editor"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              data-placeholder="Write the job details..."
              @input="syncJobDescription"
              @blur="syncJobDescription"
            ></div>
          </div>
          <div class="hero-actions">
            <button class="primary-action" type="submit">Save</button>
            <button class="secondary-action" type="button" @click="resetJobForm">Clear</button>
          </div>
        </form>
      </section>

      <section class="jobs-list" aria-label="Open jobs">
        <article v-if="!jobs.length" class="job-card">
          <p class="eyebrow">No openings yet</p>
          <h2>Check back soon.</h2>
          <p>New opportunities will show up here when they are available.</p>
        </article>

        <article v-for="job in jobs" :key="job.id" class="job-card">
          <div class="job-card-header">
            <div>
              <p class="eyebrow">Open position</p>
              <h2>{{ job.title }}</h2>
            </div>
            <button
              class="job-toggle"
              type="button"
              :aria-expanded="isJobExpanded(job.id)"
              :aria-controls="`job-details-${job.id}`"
              @click="toggleJob(job.id)"
            >
              {{ isJobExpanded(job.id) ? 'Collapse post' : 'View position' }}
              <span aria-hidden="true">{{ isJobExpanded(job.id) ? '−' : '+' }}</span>
            </button>
          </div>

          <div v-if="authStatus.loggedIn" class="job-admin-actions">
            <button class="secondary-action" type="button" @click="editJob(job)">Edit</button>
            <button class="secondary-action" type="button" @click="removeJob(job)">Delete</button>
          </div>

          <div
            v-if="isJobExpanded(job.id)"
            :id="`job-details-${job.id}`"
            class="job-details"
          >
            <div class="job-apply-row is-top">
              <button class="primary-action" type="button" @click="openApplication(job)">
                Apply now
              </button>
            </div>

            <div class="job-description" v-html="job.description"></div>

            <div class="job-apply-row is-bottom">
              <button class="primary-action" type="button" @click="openApplication(job)">
                Apply now
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="authStatus.loggedIn && jobApplications.length" class="applications-panel">
        <div class="section-heading compact-heading">
          <h2>Recent applications</h2>
          <p class="eyebrow">Admin review</p>
        </div>
        <article v-for="application in jobApplications" :key="application.id" class="application-card">
          <div>
            <p class="eyebrow">{{ application.job_title }}</p>
            <h3>{{ application.name }}</h3>
            <p>{{ application.age }} · {{ application.city }}, {{ application.state }}</p>
            <p class="application-submitted">
              Submitted {{ formatApplicationSubmittedAt(application.created_at) }}
            </p>
            <p
              class="notification-state"
              :class="application.notification_sent ? 'is-sent' : 'is-failed'"
            >
              {{
                application.notification_sent
                  ? 'Email notification sent'
                  : 'Email notification failed'
              }}
            </p>
            <p
              v-if="!application.notification_sent && application.notification_error"
              class="notification-error"
            >
              {{ application.notification_error }}
            </p>
            <p v-if="application.instagram || application.tiktok" class="application-socials">
              <a
                v-if="application.instagram"
                :href="buildSocialProfileUrl(application.instagram, 'instagram')"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a
                v-if="application.tiktok"
                :href="buildSocialProfileUrl(application.tiktok, 'tiktok')"
                target="_blank"
                rel="noopener noreferrer"
              >
                TikTok
              </a>
            </p>
          </div>
          <div class="application-actions">
            <a
              class="secondary-action compact"
              :href="application.resume_data_url"
              :download="application.resume_name"
            >
              Resume
            </a>
            <button
              v-if="!application.notification_sent"
              class="secondary-action compact"
              type="button"
              @click="retryApplicationEmail(application)"
            >
              Retry email
            </button>
          </div>
        </article>
      </section>

      <section
        v-if="selectedJob"
        class="media-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="`Apply for ${selectedJob.title}`"
        @click.self="closeApplication"
      >
        <form class="application-panel" @submit.prevent="submitApplication">
          <div class="media-viewer-header">
            <div>
              <strong>Apply for {{ selectedJob.title }}</strong>
              <span>Tell us a little about you.</span>
            </div>
            <button class="secondary-action compact" type="button" @click="closeApplication">
              Close
            </button>
          </div>

          <p
            v-if="applicationStatus.message"
            class="form-status"
            :class="`is-${applicationStatus.type}`"
            :role="applicationStatus.type === 'error' ? 'alert' : 'status'"
            aria-live="polite"
          >
            {{ applicationStatus.message }}
          </p>

          <div class="application-fields">
            <label>
              Name
              <input v-model="applicationForm.name" required autocomplete="name" />
            </label>
            <label>
              Age
              <input
                v-model="applicationForm.age"
                type="number"
                min="14"
                max="120"
                required
                inputmode="numeric"
              />
            </label>
            <label>
              City
              <input v-model="applicationForm.city" required autocomplete="address-level2" />
            </label>
            <label>
              State
              <input v-model="applicationForm.state" required autocomplete="address-level1" />
            </label>
            <label>
              Instagram
              <input v-model="applicationForm.instagram" placeholder="@username or profile link" />
            </label>
            <label>
              TikTok
              <input v-model="applicationForm.tiktok" placeholder="@username or profile link" />
            </label>
            <label class="resume-upload">
              Resume
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                required
                @change="handleResumeUpload"
              />
              <span>{{ applicationForm.resume_name || 'PDF, PNG, JPG, or JPEG' }}</span>
            </label>
          </div>

          <div class="hero-actions">
            <button class="primary-action" type="submit" :disabled="applicationSubmitting">
              {{ applicationSubmitting ? 'Submitting...' : 'Submit application' }}
            </button>
          </div>
        </form>
      </section>
    </section>

    <section v-if="page === 'privacy'" class="legal-page">
      <section class="page-title">
        <p class="eyebrow">Website policy</p>
        <h1>Privacy Policy</h1>
        <p>How The Knoxville Drone Guy handles basic website and inquiry information.</p>
      </section>

      <article class="legal-content">
        <h2>Information We Collect</h2>
        <p>
          When you contact The Knoxville Drone Guy, we may collect details you choose to provide,
          such as your name, email address, phone number, project location, and project notes.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use submitted information to respond to inquiries, schedule work, provide quotes,
          deliver media, maintain the website, and improve our services.
        </p>

        <h2>Gallery And Media</h2>
        <p>
          Public gallery media may include project videos, photos, and behind-the-scenes content
          selected by The Knoxville Drone Guy. Admin access is restricted and uses Google login.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          The site may use third-party services such as Google Drive, Google authentication, Railway,
          and social media platforms. Those services are governed by their own privacy policies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to
          <a href="mailto:theknoxvilledroneguy@gmail.com">theknoxvilledroneguy@gmail.com</a>.
        </p>
      </article>
    </section>

    <section v-if="page === 'terms'" class="legal-page">
      <section class="page-title">
        <p class="eyebrow">Website terms</p>
        <h1>Terms of Service</h1>
        <p>Basic terms for using The Knoxville Drone Guy website.</p>
      </section>

      <article class="legal-content">
        <h2>Use Of This Site</h2>
        <p>
          By using this website, you agree to use it lawfully and avoid interfering with the site,
          its media, or its server-side services.
        </p>

        <h2>Service Information</h2>
        <p>
          Website content is provided for general information about drone, ground video, photo,
          mapping, inspection, and related media services. Project availability, pricing, and scope
          are confirmed directly with The Knoxville Drone Guy.
        </p>

        <h2>Media Ownership</h2>
        <p>
          Photos, videos, branding, and gallery content on this website may not be copied,
          republished, or reused without permission from The Knoxville Drone Guy or the applicable
          rights holder.
        </p>

        <h2>External Links</h2>
        <p>
          Links to social media profiles or other third-party sites are provided for convenience.
          The Knoxville Drone Guy is not responsible for external website content or policies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to
          <a href="mailto:theknoxvilledroneguy@gmail.com">theknoxvilledroneguy@gmail.com</a>.
        </p>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    <p class="eyebrow">Follow The Knoxville Drone Guy</p>
    <nav class="social-links" aria-label="Social media links">
      <a
        v-for="social in socialLinks"
        :key="social.name"
        class="social-link"
        :href="social.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Open ${social.name} in a new tab`"
      >
        <span class="social-icon" aria-hidden="true">
          <svg
            :viewBox="`0 0 ${social.icon.icon[0]} ${social.icon.icon[1]}`"
            focusable="false"
          >
            <defs>
              <linearGradient :id="`socialGoldGradient-${social.name}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fff4b8" />
                <stop offset="24%" stop-color="#f7ce58" />
                <stop offset="48%" stop-color="#b97916" />
                <stop offset="72%" stop-color="#fff0a8" />
                <stop offset="100%" stop-color="#d8a329" />
              </linearGradient>
            </defs>
            <path :d="social.icon.icon[4]" :fill="`url(#socialGoldGradient-${social.name})`" />
          </svg>
        </span>
        <span>{{ social.name }}</span>
      </a>
    </nav>
    <nav class="footer-legal-links" aria-label="Legal links">
      <button
        v-for="link in legalLinks"
        :key="link.path"
        type="button"
        @click="navigate(link.path)"
      >
        {{ link.name }}
      </button>
    </nav>
    <p class="copyright">© 2024 The Knoxville Drone Guy. All rights reserved.</p>
  </footer>
</template>
