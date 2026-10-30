// 1. CONNECT to your database
const SUPABASE_URL = "https://kxbqvwcqcefchgdntipo.supabase.co";
const SUPABASE_KEY = "sb_publishable_kKHfZ_Dq2yEnf_VN_U_I2g_dtOpYH3X";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. DATA: time slots your salon offers each day
const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00",
                   "15:00", "16:00", "17:00", "18:00", "19:00"];

// 3. GRAB elements from the page
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("date");
const slotsDiv = document.getElementById("slots");
const message = document.getElementById("message");
const submitButton = form.querySelector("button[type=submit]");

let selectedTime = null;

// 4. No booking dates in the past
dateInput.min = new Date().toLocaleDateString("en-CA");

// 5. Turn "13:00" into "1:00 PM"
function formatTime(time) {
  const hour = Number(time.split(":")[0]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":00 " + suffix;
}

// 6. Draw the time slot buttons (now asks the database what's taken)
async function showSlots() {
  slotsDiv.innerHTML = "";
  selectedTime = null;

  if (!dateInput.value) {
    slotsDiv.innerHTML = '<p class="hint">Pick a date first</p>';
    return;
  }

  slotsDiv.innerHTML = '<p class="hint">Loading times...</p>';

  // Ask the database for taken times on this date
  const { data, error } = await db.rpc("get_taken_slots", { d: dateInput.value });

  if (error) {
    console.error(error);
    slotsDiv.innerHTML = '<p class="hint">Could not load times. Please try again.</p>';
    return;
  }

  const takenTimes = data.map(row => row.booking_time);
  slotsDiv.innerHTML = "";

  timeSlots.forEach(time => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot";
    button.textContent = formatTime(time);

    if (takenTimes.includes(time)) {
      button.disabled = true;
    }

    button.addEventListener("click", () => {
      selectedTime = time;
      document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
      button.classList.add("selected");
    });

    slotsDiv.appendChild(button);
  });
}

// 7. EVENTS
dateInput.addEventListener("change", showSlots);

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!selectedTime) {
    message.textContent = "Please choose a time slot.";
    message.style.color = "crimson";
    return;
  }

  const booking = {
    service: document.getElementById("service").value,
    booking_date: dateInput.value,
    booking_time: selectedTime,
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value
  };

  submitButton.disabled = true;
  submitButton.textContent = "Booking...";

  // Save the booking in the database
  const { error } = await db.from("bookings").insert(booking);

  submitButton.disabled = false;
  submitButton.textContent = "Confirm Booking";

  if (error) {
    // Code 23505 = the unique rule blocked a double booking
    if (error.code === "23505") {
      message.textContent = "Sorry, that time was just taken. Please pick another.";
    } else {
      message.textContent = "Something went wrong. Please try again.";
      console.error(error);
    }
    message.style.color = "crimson";
    showSlots();
    return;
  }

  message.textContent = `Thank you, ${booking.name}! You're booked for ${booking.service} on ${booking.booking_date} at ${formatTime(booking.booking_time)}.`;
  message.style.color = "green";

  form.reset();
  showSlots();
});


// ---------- Side menu (3-line button) ----------
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const overlay = document.getElementById("overlay");

function openMenu() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
  menuToggle.classList.add("active");
}

function closeMenu() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  menuToggle.classList.remove("active");
}

// Click the 3 lines: open if closed, close if open
menuToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) {
    closeMenu();
  } else {
    openMenu();
  }
});

// Click the dark area outside the menu to close it
overlay.addEventListener("click", closeMenu);

// Close after tapping a menu link
document.querySelectorAll(".sidebar a").forEach(link => {
  link.addEventListener("click", closeMenu);
});

// Press the Esc key to close
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu();
});