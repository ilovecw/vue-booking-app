<script setup>
import { ref, computed, watch } from 'vue'
import { db } from "./firebase"
import { onSnapshot, query, collection, where, doc, setDoc, updateDoc, increment } from "firebase/firestore"

// Booking state
const selectedSlot = ref('')
const showBookingModal = ref(false)
const showPaymentStep = ref(false)

// Player info
const playerName = ref('')
const phoneNumber = ref('')
const numPlayers = ref(1)
const receiptFile = ref(null)

// Time slots
const timeSlots = ['8 a.m. – 10 a.m.', '10 a.m. – 12 p.m.']

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1) // tomorrow
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0') // months 0-11
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` // local YYYY-MM-DD
})
const selectedDate = ref(minDate.value)

// Sessions
const sessions = ref([])

// Weekend check
const isWeekend = computed(() => {
  if (!selectedDate.value) return false
  const d = new Date(selectedDate.value)
  const day = d.getDay()
  return day === 0 || day === 6
})

// Real-time listener
let unsubscribe = null
watch(selectedDate, (newDate) => {
  if (unsubscribe) unsubscribe()

  const q = query(collection(db, "sessions"), where("date", "==", newDate))
  unsubscribe = onSnapshot(q, (querySnapshot) => {
      sessions.value = []
      querySnapshot.forEach(doc => {
        const data = doc.data()
        sessions.value.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now() // convert to number
        })
      })
    })


  if (isWeekend.value) selectedSlot.value = ''
}, { immediate: true })

// Enable join only if weekday and slot selected
const canJoin = computed(() =>
  selectedDate.value && selectedSlot.value && !isWeekend.value
)

// Find first session with enough space
const getAvailableSession = (slotLabel, numToJoin) => {
  const relevantSessions = sessions.value
    .filter(s => s.slot === slotLabel)
    .sort((a, b) => a.createdAt - b.createdAt) // earliest first
  return relevantSessions.find(s => (s.currentPlayers + numToJoin <= s.maxPlayers)) || null
}


// Handle receipt upload
const handleFileUpload = (event) => {
  receiptFile.value = event.target.files[0]
}

// Submit player details -> move to payment step
const submitBookingDetails = () => {
  if (!playerName.value || !phoneNumber.value || !numPlayers.value) {
    alert('Please fill in all required fields')
    return
  }
  showPaymentStep.value = true
}

// Submit booking
const submitBooking = async () => {
  try {
    // Find or create session that can fit this booking
    let session = sessions.value.find(
      s => s.slot === selectedSlot.value && (s.currentPlayers + numPlayers.value <= s.maxPlayers)
    )

    if (!session) {
      // Create a new session
      const newSessionId = `${selectedDate.value}_${selectedSlot.value}_${Date.now()}`
      const sessionRef = doc(db, "sessions", newSessionId)
      session = {
        id: newSessionId,
        date: selectedDate.value,
        slot: selectedSlot.value,
        maxPlayers: 6,
        currentPlayers: 0,
        status: "pending",
        createdAt: new Date()
      }
      await setDoc(sessionRef, session)
      sessions.value.push(session)
    }


    // Update currentPlayers in the session
    session.currentPlayers += numPlayers.value
    const sessionRef = doc(db, "sessions", session.id)
    await updateDoc(sessionRef, { currentPlayers: session.currentPlayers })

    // Create booking document (no receipt for now)
    const bookingId = `${selectedDate.value}_${selectedSlot.value}_${Date.now()}`
    const bookingRef = doc(db, "bookings", bookingId)
    const sanitizedPlayerName = playerName.value.replace(/[^a-zA-Z0-9 ]/g, '')
    await setDoc(bookingRef, {
      date: selectedDate.value,
      slot: selectedSlot.value,
      name: sanitizedPlayerName,
      phone: phoneNumber.value,
      numPlayers: numPlayers.value,
      sessionId: session.id,
      createdAt: new Date()
    })

    alert(`Booking submitted for ${numPlayers.value} player(s).\nPending verification.`)

    // Reset form
    showBookingModal.value = false
    showPaymentStep.value = false
    playerName.value = ''
    phoneNumber.value = ''
    numPlayers.value = 1

    window.location.reload()

  } catch (error) {
    console.error("Booking failed:", error)
    alert("Failed to submit booking. Please try again.")
  }
}

const getSlotPlayers = (slotLabel) => {
  const session = sessions.value
    .filter(s => s.slot === slotLabel)
    .sort((a, b) => a.createdAt - b.createdAt) // earliest first
    .find(s => s.currentPlayers < s.maxPlayers)
  return session ? session.currentPlayers : 0
}

const getMaxPlayers = (slotLabel) => {
  return 6
}

const getSessionStatus = (slotLabel) => {
  const session = sessions.value
    .filter(s => s.slot === slotLabel)
    .sort((a, b) => a.createdAt - b.createdAt) // earliest first
    .find(s => s.currentPlayers < s.maxPlayers)
  if (!session) return '0/6 players'
  return `${session.currentPlayers}/${session.maxPlayers} players`
}

const closeModal = () => {
  showBookingModal.value = false
  showPaymentStep.value = false
}
</script>



<template>
  <div class="container">
    <!-- Logo -->
    <div class="logo-container">
      <img src="./assets/logo.jpg" alt="P4 Pickleball Logo" />
    </div>

    <!-- Title -->
    <h1>P4 Pickleball</h1>

    <!-- Date Picker -->
    <label>Select Date:</label>
    <input type="date" v-model="selectedDate" :min="minDate" />
    <p v-if="isWeekend" class="error">
      ❌ Weekend booking is not available. Please select a weekday.
    </p>


    <!-- Time Slots -->
    <label>Select Time Slot:</label>
    <div class="time-slots">
      <button
        v-for="slot in timeSlots"
        :key="slot"
        @click="selectedSlot = slot"
        :disabled="isWeekend || getSlotPlayers(slot) >= getMaxPlayers(slot)"
        :class="{ selected: selectedSlot === slot, disabled: isWeekend || getSlotPlayers(slot) >= getMaxPlayers(slot) }"
      >
        {{ slot }} - {{ getSessionStatus(slot) }}
      </button>
    </div>


    <p class="note">
      ⚠️ Note: A session will only be confirmed when 6 players have booked. 
      If the session is not confirmed, payment will be automatically refunded within 1–2 working days.
    </p>
    <!-- Join Button -->
    <button
      :disabled="!canJoin"
      :class="{ disabled: !canJoin }"
      @click="showBookingModal = true"
    >
      Join Session – RM10 per person
    </button>

  <div v-if="showBookingModal" class="modal">
    <div class="modal-content">
      <!-- Step 1: Booking Details -->
      <div v-if="!showPaymentStep">
        <h2>Booking Details</h2>

        <label><span class="required">*</span>Full Name:</label>
        <input type="text" v-model="playerName" placeholder="John Doe" />

        <label><span class="required">*</span>Phone Number:</label>
        <input type="tel" v-model="phoneNumber" placeholder="+60 12-3456789" />
        <p class="input-note">
          ⚠️ Phone number is required to process refunds via Touch ’n Go.
        </p>

        <label>Number of Players:</label>
        <input type="number" v-model="numPlayers" min="1" max="6" />

        <button @click="submitBookingDetails">Next: Payment</button>
        <button class="cancel-btn" @click="showBookingModal=false">Cancel</button>
      </div>

      <div v-else>
        <h2>Payment</h2>
        <p>Transfer <strong>RM10 per person</strong> via Touch ’n Go</p>

        <div class="qr-placeholder">TnG QR Code Here</div>

        <label>Upload Payment Receipt:</label>
        <input type="file" @change="handleFileUpload" />

        <button @click="submitBooking">Submit Booking</button>
        <button class="cancel-btn" @click="closeModal">Cancel</button>
      </div>
    </div>
</div>

  </div>
</template>

<style>
/* Page background */
body {
  background-color: #f0f0f0; /* light grey */
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

/* Container stays white */
.container {
  max-width: 400px;
  margin: 20px auto;
  padding: 20px;
  background: #fff; /* white card */
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  box-sizing: border-box;
}

/* Logo */
.logo-container {
  text-align: center;
  margin-bottom: 12px;
}
.logo-container img {
  height: 250px;
  width: auto;
}

/* Headings */
h1 {
  text-align: center;
  margin-bottom: 16px;
}

/* Inputs */
input[type="date"],
input[type="text"],
input[type="tel"],
input[type="number"] {
  width: 100%;
  padding: 12px;
  margin: 8px 0 16px 0;
  border-radius: 8px;
  border: 1px solid #999;
  box-sizing: border-box;
}

/* Time Slot Buttons */
.time-slots button {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #999;
  background-color: #fff;
  color: #000;
  cursor: pointer;
  box-sizing: border-box;
}
.time-slots button.selected {
  background-color: #b7f5b7;
  border-color: #4caf50;
  color: #000;
}

/* Join Button */
button {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: none;
  border-radius: 8px;
  background-color: green;
  color: white;
  cursor: pointer;
  box-sizing: border-box;
}
button.disabled {
  background-color: #999;
  cursor: not-allowed;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}
.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}
.qr-placeholder {
  height: 150px;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
  border-radius: 8px;
}
.cancel-btn {
  background-color: #999;
  margin-top: 8px;
}

.required {
  color: red;
  font-weight: bold;
}
.input-note {
  font-size: 0.8rem;
  color: #555;
  margin-top: 4px;
  margin-bottom: 12px;
}
.error {
  color: #c62828;
  font-size: 0.85rem;
  margin-top: 6px;
  margin-bottom: 10px;
}

</style>
