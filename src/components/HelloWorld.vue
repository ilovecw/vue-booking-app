<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
      <!-- Logo -->
      <h1 class="text-2xl font-bold text-center mb-6">🏓 P4 Pickleball</h1>

      <!-- Date Selection -->
      <label class="block text-sm font-medium mb-1">Select Date</label>
      <input
        type="date"
        v-model="selectedDate"
        :min="minDate"
        class="w-full border rounded-lg p-3 mb-4"
      />

      <!-- Time Slot Selection -->
      <label class="block text-sm font-medium mb-2">Select Time Slot</label>
      <div class="space-y-3">
        <button
          v-for="slot in timeSlots"
          :key="slot"
          @click="selectedSlot = slot"
          :class="[
            'w-full p-4 rounded-xl border text-left',
            selectedSlot === slot
              ? 'bg-green-100 border-green-500'
              : 'bg-white'
          ]"
        >
          <div class="font-semibold">{{ slot }}</div>
          <div class="text-sm text-gray-600">
            {{ getSessionStatus(slot) }}
          </div>
        </button>
      </div>

      <!-- Join Button -->
      <button
        class="w-full mt-6 py-4 text-lg rounded-xl text-white"
        :class="canJoin ? 'bg-green-600' : 'bg-gray-400'"
        :disabled="!canJoin"
        @click="showPayment = true"
      >
        Join Session – RM10
      </button>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPayment" class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div class="bg-white rounded-2xl p-6 w-11/12 max-w-md">
        <h2 class="text-xl font-bold mb-4">Payment</h2>
        <p class="mb-3">Transfer <strong>RM10</strong> via Touch ’n Go</p>

        <!-- QR Placeholder -->
        <div class="bg-gray-200 h-40 flex items-center justify-center rounded-lg mb-4">
          <span class="text-gray-600">TnG QR Code Here</span>
        </div>

        <!-- Receipt Upload -->
        <label class="block text-sm font-medium mb-1">Upload Payment Receipt</label>
        <input type="file" class="w-full mb-4" />

        <button
          class="w-full py-3 bg-green-600 text-white rounded-xl"
          @click="submitBooking"
        >
          Submit Booking
        </button>

        <button
          class="w-full mt-3 py-2 text-gray-500"
          @click="showPayment = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const selectedDate = ref('')
const selectedSlot = ref('')
const showPayment = ref(false)

const timeSlots = ['8:00 – 10:00', '10:00 – 12:00']

// Tomorrow only (cutoff rule)
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})

const canJoin = computed(() => selectedDate.value && selectedSlot.value)

// Placeholder session status (later from Firebase)
const getSessionStatus = (slot) => {
  return '🟡 2 / 6 players joined'
}

const submitBooking = () => {
  alert('Booking submitted! Pending verification.')
  showPayment.value = false
}
</script>

<style>
/* Tailwind handles styling */
</style>
