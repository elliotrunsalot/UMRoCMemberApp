/* --- STORE SERVICE --- */
const STORE_KEY = 'pump_data_v3'; // Increment version to reset bad data if needed

const defaultData = {
    currentUser: null,
    users: [
        { 
            id: 'u1', 
            email: 'admin@pump.com', 
            password: 'admin', 
            firstName: 'Elliot', 
            surname: 'Cooper',
            nickname: 'Bushy', 
            role: 'admin', 
            dob: '1980-01-01',
            gender: 'Other',
            address: '123 Psychedelic Lane, Mushroom Kingdom',
            mobile: '0400000000',
            emergencyContactName: 'Mama',
            emergencyContactMobile: '0411111111',
            umnum: '001',
            permRaceNum: '11',
            raceHistory: [
                { name: 'Ultra Trail 100', date: '2020-05-20' }
            ],
            awards: [
                { type: 'Ultra Award', year: '2022' }
            ],
            joinDate: '2023-01-15',
            avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Groovy'
        },
        { 
            id: 'u2', 
            email: 'member@pump.com', 
            password: 'password', 
            firstName: 'Daisy', 
            surname: 'Chain',
            nickname: 'DayDream', 
            role: 'member', 
            dob: '1995-06-15',
            gender: 'Female',
            address: '42 Wallaby Way, Sydney',
            mobile: '0422222222',
            emergencyContactName: 'Peace',
            emergencyContactMobile: '0433333333',
            umnum: '245',
            permRaceNum: '',
            raceHistory: [],
            awards: [],
            avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Daisy'
        }
    ],
    events: [
        {
            id: 'e1',
            title: 'Sufferfest',
            date: '2025-10-31T08:00',
            description: 'How many times can you run up Stockyard spur in 6hrs?',
            rsvps: []
        },
        {
            id: 'e2',
            title: 'Grindfest',
            date: '2025-11-05T08:00',
            description: '6 hrs on the hard stuff.',
            rsvps: []
        },
        {
            id: 'e3',
            title: 'Jingleballs',
            date: '2025-12-05T07:00',
            description: 'Bring Christmas cheer. We will supply the balls.',
            rsvps: []
        }
    ],
    notifications: [],
    products: [
        {
            id: 'p1',
            name: 'Psychedelic Run Shirt',
            description: 'Run fast, look tripping. Breathable fabric.',
            image: 'img/shirt.png',
            options: [
                 { size: 'S', price: 45 },
                 { size: 'M', price: 45 },
                 { size: 'L', price: 45 },
                 { size: 'XL', price: 50 },
                 { size: '2XL', price: 50 }
            ]
        },
        {
            id: 'p2',
            name: 'Night Runner Hoodie',
            description: 'Keep warm before the race. Premium cotton.',
            image: 'img/hoodie.png',
            options: [
                 { size: 'S', price: 80 },
                 { size: 'M', price: 80 },
                 { size: 'L', price: 85 },
                 { size: 'XL', price: 85 }
            ]
        }
    ],
    cart: [],
    orders: [] // New: Store order history
};

class Store {
    constructor() {
        this.data = this.load();
    }

    load() {
        const s = localStorage.getItem(STORE_KEY);
        return s ? JSON.parse(s) : JSON.parse(JSON.stringify(defaultData));
    }

    save() {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    }

    async init() {
        try {
            // Fetch initial data from API - use allSettled so one failure doesn't block others
            const results = await Promise.allSettled([
                fetch('http://localhost:3306/users'),
                fetch('http://localhost:3306/events'),
                fetch('http://localhost:3306/products')
            ]);

            const [usersResult, eventsResult, productsResult] = results;

            if (usersResult.status === 'fulfilled' && usersResult.value.ok) {
                const users = await usersResult.value.json();
                this.data.users = users.map(u => ({
                    ...u,
                    // Parse JSON fields if they come back as strings (common in some SQL drivers)
                    // Postgres pg driver parses JSON automatically, but good to be safe if local state differs
                    raceHistory: typeof u.race_history === 'string' ? JSON.parse(u.race_history) : (u.race_history || []),
                    awards: typeof u.awards === 'string' ? JSON.parse(u.awards) : (u.awards || []),
                    // Map snake_case to CamelCase for frontend consistency
                    firstName: u.first_name || u.firstName,
                    surname: u.surname,
                    permRaceNum: u.perm_race_num || u.permRaceNum,
                    joinDate: u.join_date || u.joinDate,
                    emergencyContactName: u.emergency_contact_name || u.emergencyContactName,
                    emergencyContactMobile: u.emergency_contact_mobile || u.emergencyContactMobile
                }));
            }

            if (eventsResult.status === 'fulfilled' && eventsResult.value.ok) {
                 this.data.events = await eventsResult.value.json();
            }

            if (productsResult.status === 'fulfilled' && productsResult.value.ok) {
                 this.data.products = await productsResult.value.json();
            }
            
            this.save(); // Sync to local storage for offline resilience (optional)
        } catch (e) {
            console.error('Failed to init from DB', e);
        }
    }

    login(umnum, password) {
        // Login by UMNUM now
        const user = this.data.users.find(u => u.umnum === umnum && u.password === password);
        if (user) {
            this.data.currentUser = user;
            this.save();
            return user;
        }
        return null;
    }

    logout() {
        this.data.currentUser = null;
        this.save();
    }

    getCurrentUser() {
        // Refresh from "DB" to get latest updates
        if (this.data.currentUser) {
            const fresh = this.data.users.find(u => u.id === this.data.currentUser.id);
            if (fresh) this.data.currentUser = fresh;
        }
        return this.data.currentUser;
    }

    async updateUser(id, updates) {
        const idx = this.data.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            this.data.users[idx] = { ...this.data.users[idx], ...updates };
            if (this.data.currentUser && this.data.currentUser.id === id) {
                this.data.currentUser = this.data.users[idx];
            }
            this.save();
            
            // API Call
            await fetch(`http://localhost:3306/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            }).catch(e => console.error('DB Update Failed', e));
        }
    }

    async addRace(userId, raceName, raceDate) {
        const idx = this.data.users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            if (!this.data.users[idx].raceHistory) this.data.users[idx].raceHistory = [];
            this.data.users[idx].raceHistory.push({ name: raceName, date: raceDate });
            this.save();
            
             // API Call (Update User)
            await this.updateUser(userId, { raceHistory: this.data.users[idx].raceHistory });
        }
    }

    async addAward(userId, type, year) {
        const idx = this.data.users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            if (!this.data.users[idx].awards) this.data.users[idx].awards = [];
            this.data.users[idx].awards.push({ type, year });
            this.save();
            
            // API Call (Update User)
            await this.updateUser(userId, { awards: this.data.users[idx].awards });
        }
    }

    getEvents() {
        return this.data.events;
    }

    async rsvp(eventId, status) {
        const user = this.getCurrentUser();
        if (!user) return;

        const evt = this.data.events.find(e => e.id === eventId);
        if (evt) {
            evt.rsvps = evt.rsvps.filter(r => r.userId !== user.id);
            evt.rsvps.push({ userId: user.id, status, timestamp: new Date().toISOString() });
            this.save();
            
            // API Call
            await fetch(`http://localhost:3306/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, status })
            }).catch(e => console.error('RSVP Failed', e));
        }
    }

    async addEvent(title, date, description) {
        const id = 'e' + Date.now();
        const payload = {
            id,
            title,
            date,
            description,
            rsvps: [] // Init
        };
        this.data.events.push(payload);
        // Keep events sorted by date
        this.data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.save();
        
        // API Call
        await fetch('http://localhost:3306/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(e => console.error('Add Event Failed', e));
    }

    async addMember(details) {
        const maxUmnum = this.data.users.reduce((max, u) => Math.max(max, parseInt(u.umnum || '0')), 0);
        const newUmnum = String(maxUmnum + 1).padStart(3, '0');
        const password = 'welcome' + newUmnum; // Simple default password

        const newUser = {
            id: 'u' + Date.now(),
            umnum: newUmnum,
            password: password,
            role: 'member',
            nickname: details.firstName, // Default nickname
            raceHistory: [],
            awards: [],
            joinDate: new Date().toISOString().split('T')[0],
            avatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${details.firstName}`,
            ...details
        };

        this.data.users.push(newUser);
        this.save();
        
        // API Call
        await fetch('http://localhost:3306/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        }).catch(e => console.error('Add Member Failed', e));

        return { umnum: newUmnum, password };
    }

    /* --- SHOP METHODS --- */
    getProducts() {
        return this.data.products;
    }

    addProduct(product) {
        this.data.products.push({ id: 'p' + Date.now(), ...product });
        this.save();
    }

    getCart() {
         return this.data.cart || [];
    }

    addToCart(product, size, qty, price) {
        if (!this.data.cart) this.data.cart = [];
        const existing = this.data.cart.find(i => i.productId === product.id && i.size === size);
        if (existing) {
            existing.qty += qty;
        } else {
            this.data.cart.push({
                productId: product.id,
                name: product.name,
                image: product.image,
                size,
                price: price, // price per unit
                qty
            });
        }
        this.save();
    }

    removeFromCart(productId, size) {
        if (!this.data.cart) return;
        this.data.cart = this.data.cart.filter(i => !(i.productId === productId && i.size === size));
        this.save();
    }

    clearCart() {
        this.data.cart = [];
        this.save();
    }

    async placeOrder(details) {
        if (!this.data.orders) this.data.orders = [];
        const order = {
            id: 'ord_' + Date.now(),
            date: new Date().toISOString(),
            userId: this.data.currentUser.id,
            userSnapshot: { ...this.data.currentUser }, // Snapshot user details at time of order
            items: [ ...this.data.cart ],
            placedWithSupplier: false,
            delivered: false
        };
        this.data.orders.push(order);
        this.clearCart();
        this.save();
        
        // API Call
        await fetch('http://localhost:3306/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        }).catch(e => console.error('Order Failed', e));
    }

    updateOrder(orderId, updates) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (order) {
            Object.assign(order, updates);
            this.save();
        }
    }
}

const store = new Store();

function formatEventDate(dateInput) {
    if (!dateInput) return 'Invalid date';
    // Ensure ISO format (replace space with T if needed)
    const safeDate = dateInput.replace(' ', 'T');
    const date = new Date(safeDate);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format: "Thu 22 Jan 2026, 5:15PM"
    const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('en-AU', { month: 'short' });
    const year = date.getFullYear();
    let time = date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
    // Remove space before AM/PM and ensure uppercase
    time = time.replace(' ', '').toUpperCase();

    return `${dayName} ${dayNum} ${month} ${year}, ${time}`;
}


/* --- VIEWS --- */

function renderAuth(navigateTo) {
    const container = document.createElement('div');
    container.className = 'content';
    container.style.textAlign = 'center';
    
    container.innerHTML = `
        <div class="card" style="margin-top: 50px;">
            <h1>PUMP</h1>
            <p style="font-size: 1.2rem; margin-bottom: 20px;">Portal for UMRoC Member Pinkification</p>
            <form id="login-form">
                <div class="form-group">
                    <label>UMNUM (Member ID)</label>
                    <input type="text" id="umnum" placeholder="001" value="">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="******" value="">
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
             <div style="margin-top: 20px;">
                <p>Or sign in with</p>
                <div style="display: flex; justify-content: center; margin-top: 10px;">
                    <button class="btn-icon" style="background: white; color: #DB4437;">G</button>
                    <button class="btn-icon" style="background: black; color: white;">A</button>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const umnum = container.querySelector('#umnum').value;
        const password = container.querySelector('#password').value;
        const user = store.login(umnum, password);
        if (user) {
            navigateTo('home');
        } else {
            alert('Bummer! Wrong credentials. Try UMNUM: 001 / Password: admin');
        }
    });

    return container;
}

function renderHome(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';

    const events = store.getEvents();
    const notifications = [];
    const now = new Date();
    events.forEach(e => {
        const evtDate = new Date(e.date);
        const diffDays = Math.ceil((evtDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 14 && diffDays > 0) {
            notifications.push(`Hey ${user.nickname}! "${e.title}" is coming up in ${diffDays} days!`);
        }
    });

    let notifHtml = '';
    if (notifications.length > 0) {
        notifHtml = `
            <div class="card" style="background: rgba(255, 221, 0, 0.9); border-color: var(--color-pink);">
                <h3>🔔 Vibes Check</h3>
                <ul style="list-style: none; margin-top: 10px;">
                    ${notifications.map(n => `<li style="margin-bottom: 5px;">${n}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 0 15px;">
            <h1 style="font-size: 2.5rem; color: var(--color-white); -webkit-text-stroke: 1px var(--color-purple);">Hi, ${user.nickname}!</h1>
            <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; border: 3px solid var(--color-white);">
                <img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        </div>
        ${notifHtml}
        <div class="card">
            <h2>Upcoming Events</h2>
            <div id="events-list"></div>
            <button id="view-all-events" class="btn btn-secondary">Full Calendar</button>
        </div>
        <div class="card">
            <h2>Membership Status</h2>
            <p>Active until Dec 2026</p>
            <p><strong>UMNUM:</strong> ${user.umnum || 'Pending'}</p>
            <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                <input type="hidden" name="business" value="Q7RWDDT9G88QG">
                <input type="hidden" name="cmd" value="_xclick">
                <input type="hidden" name="item_name" value="Annual Membership">
                <input type="hidden" name="amount" value="15.00">
                <input type="hidden" name="currency_code" value="AUD">
                <button type="submit" class="btn btn-primary">Pay Dues via PayPal ($15 AUD)</button>
            </form>
        </div>
    `;

    const eventsList = container.querySelector('#events-list');
    events.slice(0, 2).forEach(evt => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px dashed var(--color-purple)';
        div.innerHTML = `<strong>${evt.title}</strong><br><span>${new Date(evt.date).toLocaleDateString()}</span>`;
        eventsList.appendChild(div);
    });

    container.querySelector('#view-all-events').addEventListener('click', () => navigateTo('calendar'));
    return container;
}

function renderCalendar(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }
    
    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `<h1 style="color: var(--color-white); text-align: center; margin-bottom: 20px;">Groovy Events</h1><div id="calendar-list"></div>`;

    const list = container.querySelector('#calendar-list');
    const events = store.getEvents();
    const isAdmin = user.role === 'admin';

    events.forEach(evt => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const myRsvp = evt.rsvps.find(r => r.userId === user.id);
        const status = myRsvp ? myRsvp.status : 'pending';
        const attendingCount = evt.rsvps.filter(r => r.status === 'attending').length;

        card.innerHTML = `
            <h3>${evt.title}</h3>
            <p style="font-weight: bold; color: var(--color-pink);">${formatEventDate(evt.date)}</p>
            <p style="margin: 10px 0;">${evt.description}</p>
             <div style="margin-top: 15px; padding-top: 10px; border-top: 2px dashed #eee;">
                <label>Your RSVP:</label>
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button class="rsvp-btn btn ${status === 'attending' ? 'btn-primary' : 'btn-secondary'}" data-val="attending">Attending</button>
                    <button class="rsvp-btn btn ${status === 'not_attending' ? 'btn-primary' : 'btn-secondary'}" data-val="not_attending" style="background: #ccc;">Can't Make It</button>
                </div>
            </div>
            ${isAdmin ? `<div style="margin-top: 15px; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 10px;"><strong>Admin:</strong> ${attendingCount} attending</div>` : ''}
        `;

        card.querySelectorAll('.rsvp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                store.rsvp(evt.id, btn.dataset.val);
                navigateTo('calendar');
            });
        });
        list.appendChild(card);
    });

    if (isAdmin) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerText = '+ Add New Event';
        addBtn.style.marginTop = '20px';
        
        // Modal Container
        const modal = document.createElement('div');
        modal.className = 'modal-overlay hidden';
        // We use inline styles here for the overlay to ensure it sits on top correctly without polluting global CSS for a single-use modal
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(42, 0, 51, 0.85); z-index: 2000; align-items: center; justify-content: center; display: none;';
        
        modal.innerHTML = `
            <div class="card" style="width: 90%; max-width: 500px; margin: 0; box-shadow: 0 0 20px rgba(0,0,0,0.5); animation: popIn 0.3s ease-out;">
                <h2 style="color: var(--color-purple); text-align:center; margin-bottom:15px;">New Run/Event</h2>
                <form id="add-event-form">
                    <div class="form-group">
                        <label>Event Name</label>
                        <input type="text" id="evtTitle" required placeholder="e.g. Sunday Long Run">
                    </div>
                    <div class="form-group">
                        <label>Date & Time</label>
                        <input type="datetime-local" id="evtDate" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="evtDesc" rows="3" required placeholder="Where we meeting? How far?"></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancel-evt" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Event</button>
                    </div>
                </form>
            </div>
            <style>
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
        
        container.appendChild(modal);
        container.appendChild(addBtn);

        const toggleModal = (show) => {
            if (show) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
                // Reset form on open
                if(show) {
                     const now = new Date();
                     now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                     modal.querySelector('#evtDate').value = now.toISOString().slice(0,16);
                }
            } else {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        };

        addBtn.onclick = () => toggleModal(true);
        modal.querySelector('#cancel-evt').onclick = () => toggleModal(false);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) toggleModal(false);
        });

        modal.querySelector('#add-event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = modal.querySelector('#evtTitle').value;
            const date = modal.querySelector('#evtDate').value;
            const desc = modal.querySelector('#evtDesc').value;
            
            store.addEvent(title, date, desc);
            // No alert, just feels faster
            toggleModal(false);
            navigateTo('calendar');
        });
    }
    return container;
}

function renderProfile(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }
    const isAdmin = user.role === 'admin';

    const container = document.createElement('div');
    container.className = 'content';
    
    // Race History HTML
    const raceHistoryHtml = (user.raceHistory || []).map(r => 
        `<li><strong>${r.name}</strong> - ${r.date}</li>`
    ).join('');

    // Awards HTML
    const awardsHtml = (user.awards || []).map(a => 
         `<li><span style="font-size:1.5rem">🏆</span> <strong>${a.type}</strong> (${a.year})</li>`
    ).join('');

    container.innerHTML = `
        <div class="card" style="text-align: center;">
            <div style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--color-yellow); margin: 0 auto; overflow: hidden; background: #fff;">
                <img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h2 style="color: var(--color-purple); margin-top: 10px;">${user.firstName} ${user.surname || ''}</h2>
            <p>"${user.nickname}"</p>
            <p><strong>UMNUM:</strong> ${user.umnum || '--'} | <strong>Perm #:</strong> ${user.permRaceNum || '--'}</p>
        </div>

        ${awardsHtml ? `
        <div class="card" style="background: linear-gradient(135deg, #FFD700 0%, #FFF8DC 100%);">
            <h3>Hall of Fame</h3>
            <ul style="list-style: none; padding: 0;">${awardsHtml}</ul>
        </div>
        ` : ''}

        <div class="card">
            <h3>Edit Details</h3>
            <form id="profile-form">
                <div class="form-group"><label>First Name</label><input type="text" id="firstName" value="${user.firstName}"></div>
                <div class="form-group"><label>Surname</label><input type="text" id="surname" value="${user.surname || ''}"></div>
                <div class="form-group"><label>Date of Birth</label><input type="date" id="dob" value="${user.dob || ''}"></div>
                <div class="form-group"><label>Gender</label>
                    <select id="gender">
                        <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Non-Binary" ${user.gender === 'Non-Binary' ? 'selected' : ''}>Non-Binary</option>
                        <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group"><label>Home Address</label><textarea id="address" rows="3">${user.address || ''}</textarea></div>
                <div class="form-group"><label>Email Address</label><input type="email" id="email" value="${user.email}"></div>
                <div class="form-group"><label>Mobile Phone</label><input type="tel" id="mobile" value="${user.mobile || ''}"></div>
                
                ${isAdmin ? `
                <div style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <h4 style="margin-top:0; color: var(--color-purple);">Admin Controls</h4>
                    <div class="form-group"><label>UMNUM</label><input type="text" id="umnum" value="${user.umnum || ''}"></div>
                    <div class="form-group"><label>Password</label><input type="text" id="password" value="${user.password || ''}"></div>
                    <div class="form-group"><label>Permanent Race Number</label><input type="text" id="permRaceNum" value="${user.permRaceNum || ''}"></div>
                    <div class="form-group"><label>Join Date</label><input type="date" id="joinDate" value="${user.joinDate || ''}"></div>
                    <div class="form-group"><label>Nickname</label><input type="text" id="nickname" value="${user.nickname}"></div>
                </div>
                ` : ''}

                <hr style="margin: 20px 0; border: 1px dashed var(--color-purple);">
                
                <div class="form-group"><label>Emergency Contact Name</label><input type="text" id="ecName" value="${user.emergencyContactName || ''}"></div>
                <div class="form-group"><label>Emergency Contact Mobile</label><input type="tel" id="ecMobile" value="${user.emergencyContactMobile || ''}"></div>

                <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
        </div>
        
        <div class="card">
            <h3>Race History</h3>
            <ul style="list-style: none; padding-left: 0; margin-bottom: 15px;">
                ${raceHistoryHtml.length ? raceHistoryHtml : '<li>No races recorded yet!</li>'}
            </ul>
            <div style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 10px;">
                <h4>Add Race</h4>
                <input type="text" id="newRaceName" placeholder="Race Name" style="margin-bottom: 5px;">
                <input type="date" id="newRaceDate" style="margin-bottom: 5px;">
                <button id="add-race-btn" class="btn btn-secondary" style="padding: 10px; font-size: 0.9rem;">Add Record</button>
            </div>
        </div>
    `;
    
    container.querySelector('#profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const updates = {
            firstName: container.querySelector('#firstName').value,
            surname: container.querySelector('#surname').value,
            dob: container.querySelector('#dob').value,
            gender: container.querySelector('#gender').value,
            address: container.querySelector('#address').value,
            email: container.querySelector('#email').value,
            mobile: container.querySelector('#mobile').value,
            emergencyContactName: container.querySelector('#ecName').value,
            emergencyContactMobile: container.querySelector('#ecMobile').value,
        };
        if (isAdmin) {
            updates.nickname = container.querySelector('#nickname').value;
            updates.umnum = container.querySelector('#umnum').value;
            updates.password = container.querySelector('#password').value;
            updates.permRaceNum = container.querySelector('#permRaceNum').value;
            updates.joinDate = container.querySelector('#joinDate').value;
        }
        store.updateUser(user.id, updates);
        alert('Profile Updated!');
        navigateTo('profile');
    });

    container.querySelector('#add-race-btn').addEventListener('click', () => {
        const name = container.querySelector('#newRaceName').value;
        const date = container.querySelector('#newRaceDate').value;
        if (name && date) {
            store.addRace(user.id, name, date);
            navigateTo('profile');
        } else {
            alert('Please enter both race name and date.');
        }
    });

    return container;
}

function renderAdmin(navigateTo) {
    const currentUser = store.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') { navigateTo('home'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `
        <h1>Club Command Center</h1>
        <div class="card">
            <h2>📢 Blast Communications</h2>
            <textarea id="msg-text" rows="4" placeholder="Write your update here... (We'll add 'Hi [Nickname]' automatically)"></textarea>
            <div style="text-align: right; margin-top: 10px;">
                <button id="send-btn" class="btn btn-primary">Send Blast</button>
            </div>
            
            <hr style="margin: 20px 0; border: 1px dashed var(--color-purple);">
            <h3>Broadcast History</h3>
            <div id="blast-history-container" style="min-height: 120px; padding: 15px; background: rgba(255,255,255,0.7); border-radius: 10px; border: 1px solid rgba(0,0,0,0.1);"></div>
             <div id="blast-nav" style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; align-items: center;">
                 <button id="prev-blast" class="btn btn-secondary" style="padding: 5px 15px;" disabled>&lt;</button>
                 <span id="blast-counter" style="font-weight: bold; font-family: 'Patrick Hand', cursive; font-size: 1.2rem;">0 / 0</span>
                 <button id="next-blast" class="btn btn-secondary" style="padding: 5px 15px;" disabled>&gt;</button>
            </div>
        </div>
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>👥 Member Management</h2>
                <button id="add-member-btn" class="btn btn-primary" style="width: auto; padding: 5px 15px;">+ Add Member</button>
            </div>
            <div id="members-list"></div>
        </div>
        
        <!-- REPORTS SECTION -->
        <div class="card" id="reports-section">
            <h2>📊 Club Intelligence</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button id="btn-rep-activity" class="btn btn-secondary">Activity Report</button>
                <button id="btn-rep-orders" class="btn btn-secondary">Orders Report</button>
            </div>
            <div id="report-display-area" style="overflow-x: auto;"></div>
        </div>

        <!-- Add Member Modal -->
        <div id="add-member-modal" class="modal-overlay hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(42, 0, 51, 0.95); z-index: 2000; align-items: center; justify-content: center; display: none; overflow-y: auto;">
            <div class="card" style="width: 95%; max-width: 600px; margin: 20px auto; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                <h2 style="color: var(--color-purple); text-align:center;">Register New Member</h2>
                <form id="add-member-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group"><label>First Name</label><input type="text" id="new-fname" required></div>
                        <div class="form-group"><label>Surname</label><input type="text" id="new-sname" required></div>
                    </div>
                    <div class="form-group"><label>Date of Birth</label><input type="date" id="new-dob" required></div>
                    <div class="form-group"><label>Gender</label>
                        <select id="new-gender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Email</label><input type="email" id="new-email" required></div>
                    <div class="form-group"><label>Mobile</label><input type="tel" id="new-mobile" required></div>
                    <div class="form-group"><label>Address</label><textarea id="new-address" rows="2"></textarea></div>
                    <h4 style="margin-top: 15px;">Emergency Contact</h4>
                    <div class="form-group"><label>Name</label><input type="text" id="new-ecname"></div>
                    <div class="form-group"><label>Mobile</label><input type="tel" id="new-ecmobile"></div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancel-add-member" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Member</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const membersList = container.querySelector('#members-list');

    /* --- BLAST MESSAGE LOGIC --- */
    const blastState = { items: [], index: 0 };
    const blastContainer = container.querySelector('#blast-history-container');
    const blastCounter = container.querySelector('#blast-counter');
    const btnPrev = container.querySelector('#prev-blast');
    const btnNext = container.querySelector('#next-blast');

    const renderBlast = () => {
        if (blastState.items.length === 0) {
            blastContainer.innerHTML = '<em style="color:#666;">No history available (or DB offline).</em>';
            blastCounter.innerText = '0 / 0';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }
        
        const msg = blastState.items[blastState.index];
        const dateStr = new Date(msg.date_sent).toLocaleString();
        
        blastContainer.innerHTML = `
            <div style="animation: fadeIn 0.3s;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                    <strong style="color:var(--color-purple); font-size: 1.1rem;">${msg.subject || 'Member Update'}</strong>
                    <span style="font-size:0.8rem; color:#666;">${dateStr}</span>
                </div>
                <p style="white-space: pre-wrap; font-family: sans-serif; line-height: 1.5;">${msg.message}</p>
                <div style="text-align:right; font-size:0.7rem; color:#999; margin-top:10px;">Sent by: ${msg.sent_by || 'Admin'}</div>
            </div>
        `;
        
        blastCounter.innerText = `${blastState.index + 1} / ${blastState.items.length}`;
        btnPrev.disabled = blastState.index === 0;
        btnNext.disabled = blastState.index === blastState.items.length - 1;
    };

    const loadBlasts = async () => {
        try {
            blastContainer.innerHTML = 'Loading...';
            // Attempt to fetch from local backend (Port 3306)
            const res = await fetch('http://localhost:3306/blast-messages');
            if(res.ok) {
                blastState.items = await res.json();
                blastState.index = 0;
            } else {
                 throw new Error('API Error');
            }
        } catch(e) {
            console.log('Backend unreachable for blasts');
             // Fallback for visual demonstration if backend is off
            blastState.items = []; 
        }
        renderBlast();
    };

    btnPrev.onclick = () => { if(blastState.index > 0) { blastState.index--; renderBlast(); } };
    btnNext.onclick = () => { if(blastState.index < blastState.items.length - 1) { blastState.index++; renderBlast(); } };

    // Initial Load
    loadBlasts();

    // Send Logic
    container.querySelector('#send-btn').addEventListener('click', async () => {
        const txt = container.querySelector('#msg-text').value;
        if(!txt) return;
        
        const btn = container.querySelector('#send-btn');
        const oldText = btn.innerText;
        btn.innerText = 'Sending...';
        btn.disabled = true;

        try {
            const payload = {
                id: 'bm_' + Date.now(),
                subject: 'UMRoC Official Update',
                message: txt,
                sent_by: currentUser.nickname
            };
            
            const res = await fetch('http://localhost:3306/blast-messages', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
            });
            
            if(res.ok) {
                alert('Blast sent successfully!');
                container.querySelector('#msg-text').value = '';
                loadBlasts(); // Refresh
            } else {
                throw new Error('Failed');
            }
        } catch(e) {
            alert('Failed to send blast. Is the local database running?');
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });
    
    // Helper to generate full edit form for a user
    const createEditForm = (u) => `
        <div class="admin-edit-panel hidden" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 10px;">
            <h4>Edit Member Details</h4>
            <div class="form-group"><label>First Name</label><input type="text" class="adm-fname" value="${u.firstName}"></div>
            <div class="form-group"><label>Surname</label><input type="text" class="adm-sname" value="${u.surname || ''}"></div>
            <div class="form-group"><label>Nickname</label><input type="text" class="adm-nick" value="${u.nickname}"></div>
            <div class="form-group"><label>Email</label><input type="text" class="adm-email" value="${u.email}"></div>
            <div class="form-group"><label>UMNUM</label><input type="text" class="adm-umnum" value="${u.umnum || ''}"></div>
            <div class="form-group"><label>Perm Race #</label><input type="text" class="adm-perm" value="${u.permRaceNum || ''}"></div>
            <div class="form-group"><label>Mobile</label><input type="text" class="adm-mobile" value="${u.mobile || ''}"></div>
            
            <h4 style="margin-top: 15px;">Awards</h4>
            <div style="margin-bottom: 10px;">
                ${(u.awards || []).map(a => `<span style="background:var(--color-yellow); padding: 2px 5px; border-radius: 4px; margin-right: 5px; font-size: 0.8rem;">${a.type} '${a.year}</span>`).join('')}
            </div>
            <div style="display: flex; gap: 5px;">
                <select class="adm-award-type">
                    <option value="Ultra Award">Ultra Award</option>
                    <option value="Mediocre Award">Mediocre Award</option>
                </select>
                <input type="number" class="adm-award-year" placeholder="Year" style="width: 80px;">
                <button class="add-award-btn btn-secondary" style="padding: 5px;">Add</button>
            </div>

            <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; display: flex; justify-content: space-between;">
                <button class="save-adm btn-primary" style="padding: 10px; font-size: 0.9rem;">Save Details</button>
                ${u.id !== currentUser.id ? `<button class="toggle-role btn-secondary" style="padding: 10px; font-size: 0.9rem; background: #666;">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>` : ''}
            </div>
        </div>
    `;

    store.data.users.forEach(u => {
        const row = document.createElement('div');
        row.className = 'card';
        row.style.margin = '10px 0';
        
        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div><strong>${u.firstName} ${u.surname || ''}</strong> (${u.role})<br><span style="font-size: 0.8rem;">UMNUM: ${u.umnum || 'N/A'}</span></div>
                <button class="toggle-edit btn-secondary" style="padding: 5px; width: auto;">Manage</button>
            </div>
            ${createEditForm(u)}
        `;
        
        const panel = row.querySelector('.admin-edit-panel');
        row.querySelector('.toggle-edit').onclick = () => panel.classList.toggle('hidden');
        
        // Save Details
        row.querySelector('.save-adm').onclick = () => {
            store.updateUser(u.id, {
                firstName: row.querySelector('.adm-fname').value,
                surname: row.querySelector('.adm-sname').value,
                nickname: row.querySelector('.adm-nick').value,
                email: row.querySelector('.adm-email').value,
                umnum: row.querySelector('.adm-umnum').value,
                permRaceNum: row.querySelector('.adm-perm').value,
                mobile: row.querySelector('.adm-mobile').value
            });
            alert('User Updated');
            navigateTo('admin');
        };

        // Add Award
        row.querySelector('.add-award-btn').onclick = () => {
            const type = row.querySelector('.adm-award-type').value;
            const year = row.querySelector('.adm-award-year').value;
            if (type && year) {
                store.addAward(u.id, type, year);
                alert('Award Added!');
                navigateTo('admin');
            }
        };

        // Toggle Role
        const roleBtn = row.querySelector('.toggle-role');
        if (roleBtn) {
            roleBtn.onclick = () => {
                store.updateUser(u.id, { role: u.role === 'admin' ? 'member' : 'admin' });
                navigateTo('admin');
            };
        }
        
        membersList.appendChild(row);
    });

    // Add Member Modal Logic
    const addMemberModal = container.querySelector('#add-member-modal');
    const toggleAddMember = (show) => {
        if (show) {
            addMemberModal.classList.remove('hidden');
            addMemberModal.style.display = 'flex';
        } else {
            addMemberModal.classList.add('hidden');
            addMemberModal.style.display = 'none';
        }
    };

    container.querySelector('#add-member-btn').onclick = () => toggleAddMember(true);
    container.querySelector('#cancel-add-member').onclick = () => toggleAddMember(false);
    addMemberModal.addEventListener('click', (e) => {
        if (e.target === addMemberModal) toggleAddMember(false);
    });

    container.querySelector('#add-member-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const details = {
            firstName: container.querySelector('#new-fname').value,
            surname: container.querySelector('#new-sname').value,
            dob: container.querySelector('#new-dob').value,
            gender: container.querySelector('#new-gender').value,
            email: container.querySelector('#new-email').value,
            mobile: container.querySelector('#new-mobile').value,
            address: container.querySelector('#new-address').value,
            emergencyContactName: container.querySelector('#new-ecname').value,
            emergencyContactMobile: container.querySelector('#new-ecmobile').value,
        };

        const creds = store.addMember(details);
        alert(`Member Created!\nEmail sent to: ${details.email}\n\nCredentials:\nUMNUM: ${creds.umnum}\nPassword: ${creds.password}`);
        toggleAddMember(false);
        navigateTo('admin');
    });



    /* --- Reports Logic --- */
    const reportsDiv = container.querySelector('#reports-section');
    const displayArea = reportsDiv.querySelector('#report-display-area');

    // Helper: CSV Export
    const downloadCSV = (filename, rows) => {
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function renderTable(headers, dataRowsWithMeta, reportName) {
        // dataRowsWithMeta can be simple array of arrays OR [{rawOrder, cols: []}] for interactive columns
        const isInteractive = dataRowsWithMeta.length > 0 && dataRowsWithMeta[0].rawOrder;

        let html = `
            <div style="background: white; padding: 10px; border-radius: 5px; color: black; min-width: 800px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <h3 style="color: var(--color-purple); margin:0;">${reportName.replace('_', ' ')}</h3>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-close-rep btn-secondary" style="padding: 2px 10px; font-size: 0.8rem;">Close</button>
                        <button class="btn-export-excel btn-primary" style="padding: 2px 10px; font-size: 0.8rem;">Export Excel</button>
                        <button class="btn-export-sheets btn-primary" style="padding: 2px 10px; font-size: 0.8rem;">Export Sheets</button>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="background: #eee;">${headers.map(h => `<th style="padding: 5px; border: 1px solid #ddd;">${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
        `;

        dataRowsWithMeta.forEach((row, idx) => {
            const cols = isInteractive ? row.cols : row;
            html += `<tr style="border-bottom: 1px solid #ddd;">`;
            
            cols.forEach((val, cIdx) => {
                // Special handling for last 2 columns in Interactive Orders mode (checkboxes)
                if (isInteractive && (cIdx === 9 || cIdx === 10)) {
                    // 9 = Placed, 10 = Delivered
                    const checked = val ? 'checked' : '';
                    const type = cIdx === 9 ? 'placedWithSupplier' : 'delivered';
                    html += `<td style="padding: 5px; text-align: center;"><input type="checkbox" class="adm-chk" data-oid="${row.rawOrder.id}" data-type="${type}" ${checked}></td>`;
                } else {
                    html += `<td style="padding: 5px;">${val}</td>`;
                }
            });

            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        displayArea.innerHTML = html;

        // Checkbox listeners
        if (isInteractive) {
            displayArea.querySelectorAll('.adm-chk').forEach(chk => {
                chk.addEventListener('change', () => {
                    store.updateOrder(chk.dataset.oid, { [chk.dataset.type]: chk.checked });
                });
            });
        }

        // Buttons
        displayArea.querySelector('.btn-close-rep').onclick = () => displayArea.innerHTML = '';
        
        const plainRows = dataRowsWithMeta.map(r => isInteractive ? r.cols : r);
        const exportData = [headers, ...plainRows];

        displayArea.querySelector('.btn-export-excel').onclick = () => downloadCSV(reportName + '.csv', exportData);
        displayArea.querySelector('.btn-export-sheets').onclick = () => downloadCSV(reportName + '_for_sheets.csv', exportData);
    }

    // Activity Report Logic
    reportsDiv.querySelector('#btn-rep-activity').onclick = () => {
        const members = store.data.users; 
        const currentYear = new Date().getFullYear();
        
        const reportData = members.map(u => {
            const attendance = store.getEvents().filter(evt => {
                const isCurrentYear = new Date(evt.date).getFullYear() === currentYear;
                const rsvp = (evt.rsvps || []).find(r => r.userId === u.id);
                return isCurrentYear && rsvp && rsvp.status === 'attending';
            }).length;

            const participation = (u.raceHistory || [])
                .filter(r => new Date(r.date).getFullYear() === currentYear)
                .map(r => r.name)
                .join(', ');

            return {
                firstName: u.firstName,
                nickname: u.nickname,
                surname: u.surname || '',
                joinDate: u.joinDate || 'N/A',
                umnum: u.umnum || '-',
                attendance,
                participation
            };
        });

        renderTable(
            ['First Name', 'Nickname', 'Surname', 'Join Date', 'UMNUM', 'Attendance (Curr Year)', 'Participation (Curr Year)'],
            reportData.map(d => [d.firstName, d.nickname, d.surname, d.joinDate, d.umnum, d.attendance, `"${d.participation}"`]),
            'Activity_Report'
        );
    };

    // Orders Report Logic
    reportsDiv.querySelector('#btn-rep-orders').onclick = () => {
        const orders = (store.data.orders || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const rows = [];
        orders.forEach(o => {
            o.items.forEach(item => {
                rows.push({
                    rawOrder: o, 
                    cols: [
                        o.userSnapshot.firstName,
                        o.userSnapshot.nickname,
                        o.userSnapshot.surname || '',
                        item.name,
                        item.size,
                        item.qty,
                        `"${o.userSnapshot.address || ''}"`,
                        o.userSnapshot.email,
                        o.userSnapshot.mobile || '',
                        o.placedWithSupplier,
                        o.delivered
                    ]
                });
            });
        });

        renderTable(
            ['First Name', 'Nickname', 'Surname', 'Item', 'Size', 'Units', 'Address', 'Email', 'Mobile', 'Placed with Supplier', 'Delivered'],
            rows,
            'Orders_Report'
        );
    };

    return container;
}

function renderSocial(navigateTo) {
    const currentUser = store.getCurrentUser();
    if (!currentUser) { navigateTo('auth'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `
        <h1 style="text-align: center; color: var(--color-white); margin-bottom: 20px;">Social Vibes</h1>
        <div id="social-list"></div>
    `;

    const list = container.querySelector('#social-list');
    const allUsers = store.data.users;
    const currentYear = new Date().getFullYear().toString();

    allUsers.forEach(u => {
        // Skip current user if desired? Usually social shows everyone including self, or everyone else. User asked for "view the profiles of all other club members".
        // "view the profiles of all other club members" implies excluding self?
        // Let's exclude self for strict compliance, or maybe include everyone. "Other" usually means "not me".
        // Code: if (u.id === currentUser.id) return;
        
        if (u.id === currentUser.id) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '10px';

        // Awards
        const awardsHtml = (u.awards || []).map(a => 
            `<span style="background:var(--color-yellow); color:var(--color-purple); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight:bold; display:inline-block; margin:2px;">🏆 ${a.type}</span>`
        ).join('');

        // Races this year
        const racesThisYear = (u.raceHistory || []).filter(r => r.date.startsWith(currentYear));
        const racesHtml = racesThisYear.length > 0 
            ? `<ul style="list-style-type: disc; padding-left: 20px; font-size: 0.9rem;">${racesThisYear.map(r => `<li>${r.name}</li>`).join('')}</ul>`
            : '<span style="font-size: 0.8rem; font-style: italic; color: #666;">No races this year.</span>';

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 70px; height: 70px; min-width: 70px; border-radius: 50%; overflow: hidden; border: 3px solid var(--color-purple);">
                    <img src="${u.avatar}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <h3 style="margin: 0; color: var(--color-purple); font-size: 1.4rem;">${u.firstName} ${u.surname || ''}</h3>
                    <p style="font-size: 0.9rem; margin-top: 2px;">${u.nickname}</p>
                </div>
            </div>
            
            <div style="margin-top: 10px;">
                ${awardsHtml ? `
                    <div style="margin-bottom: 10px;">
                        <strong style="display:block; font-size: 0.8rem; color: #555; margin-bottom: 2px;">Awards</strong>
                        ${awardsHtml}
                    </div>` : ''
                }
                
                <div>
                    <strong style="font-size: 0.9rem; color: #555;">Races in ${currentYear}</strong>
                    ${racesHtml}
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    if (list.children.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: white;">No other members to show yet!</p>';
    }

    return container;
}



function renderShop(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }
    const isAdmin = user.role === 'admin';

    const container = document.createElement('div');
    container.className = 'content';
    
    // Cart Summary Button
    const cartCount = store.getCart().reduce((sum, i) => sum + i.qty, 0);
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="color: var(--color-white);">Club Merch</h1>
            <button id="cart-btn" class="btn btn-secondary" style="width: auto;">🛒 Cart (${cartCount})</button>
        </div>
        <div id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;"></div>
    `;

    const grid = container.querySelector('#products-grid');
    const products = store.getProducts();

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        
        // Size Options
        const optionsHtml = p.options.map(opt => `<option value="${opt.size}|${opt.price}">${opt.size} - $${opt.price}</option>`).join('');

        card.innerHTML = `
            <div style="height: 200px; overflow: hidden; border-radius: 10px; margin-bottom: 10px; background: white; display: flex; align-items: center; justify-content: center;">
                <img src="${p.image}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
            <h3 style="margin-bottom: 5px;">${p.name}</h3>
            <p style="font-size: 0.9rem; color: #555; flex-grow: 1;">${p.description}</p>
            
            <div style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 10px;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select class="p-option" style="flex: 2;">${optionsHtml}</select>
                    <input type="number" class="p-qty" value="1" min="1" style="flex: 1;">
                </div>
                <button class="add-cart-btn btn btn-primary">Add to Cart</button>
            </div>
        `;
        
        card.querySelector('.add-cart-btn').onclick = () => {
            const [size, price] = card.querySelector('.p-option').value.split('|');
            const qty = parseInt(card.querySelector('.p-qty').value);
            store.addToCart(p, size, qty, parseFloat(price));
            alert('Added to Cart!');
            navigateTo('shop'); // Refresh to update count
        };

        grid.appendChild(card);
    });

    // Admin Add Product
    if (isAdmin) {
        const addDiv = document.createElement('div');
        addDiv.className = 'card';
        addDiv.style.border = '2px dashed var(--color-purple)';
        addDiv.style.display = 'flex';
        addDiv.style.alignItems = 'center';
        addDiv.style.justifyContent = 'center';
        addDiv.style.cursor = 'pointer';
        addDiv.style.minHeight = '300px';
        addDiv.innerHTML = `<h3 style="color: var(--color-purple);">+ Add New Merch</h3>`;
        addDiv.onclick = () => {
             const name = prompt("Item Name:");
             if(!name) return;
             const desc = prompt("Description:");
             const img = prompt("Image URL (or leave blank for placeholder):") || "https://placehold.co/400";
             const price = prompt("Base Price:");
             
             store.addProduct({
                 name,
                 description: desc,
                 image: img,
                 options: [ { size: 'One Size', price: parseInt(price) || 20 } ]
             });
             alert('Product Added');
             navigateTo('shop');
        };
        grid.appendChild(addDiv);
    }

    container.querySelector('#cart-btn').onclick = () => navigateTo('checkout');
    return container;
}

function renderCheckout(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `<h1 style="color: white; margin-bottom: 20px;">Checkout</h1>`;

    const cart = store.getCart();
    
    if (cart.length === 0) {
        container.innerHTML += `<div class="card"><p>Your cart is empty!</p><button id="back-shop" class="btn btn-secondary">Go Shopping</button></div>`;
        setTimeout(() => { container.querySelector('#back-shop').onclick = () => navigateTo('shop'); }, 0);
        return container;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const cartList = cart.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="font-size: 0.9rem;">Size: ${item.size} | Qty: ${item.qty}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div>$${(item.price * item.qty).toFixed(2)}</div>
                <button class="remove-btn" style="color: red; background: none; border: none; font-size: 0.8rem; cursor: pointer; text-decoration: underline;" data-pid="${item.productId}" data-sz="${item.size}">Remove</button>
            </div>
        </div>
    `).join('');

    let paypalInputs = `
        <input type="hidden" name="business" value="Q7RWDDT9G88QG">
        <input type="hidden" name="cmd" value="_cart">
        <input type="hidden" name="upload" value="1">
        <input type="hidden" name="currency_code" value="AUD">
    `;
    
    cart.forEach((item, index) => {
        const idx = index + 1;
        paypalInputs += `
            <input type="hidden" name="item_name_${idx}" value="${item.name} (${item.size})">
            <input type="hidden" name="amount_${idx}" value="${item.price}">
            <input type="hidden" name="quantity_${idx}" value="${item.qty}">
        `;
    });

    container.innerHTML += `
        <div class="card">
            ${cartList}
            <div style="margin-top: 20px; text-align: right; font-size: 1.5rem; color: var(--color-purple);">
                <strong>Total: $${total.toFixed(2)}</strong>
            </div>
            <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                ${paypalInputs}
                <button id="pay-final-btn" type="submit" class="btn btn-primary" style="margin-top: 20px; font-size: 1.2rem;">Pay with <span style="font-weight: bold; font-style: italic;">PayPal</span></button>
            </form>
        </div>
    `;

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = () => {
            store.removeFromCart(btn.dataset.pid, btn.dataset.sz);
            navigateTo('checkout');
        };
    });

    container.querySelector('#pay-final-btn').onclick = () => {
        const confirm = window.confirm(`Redirecting to PayPal to pay $${total.toFixed(2)}...\n\nClick OK if payment was successful to return to the Club.`);
        if (confirm) {
            store.placeOrder({ total: total });
            alert('Payment Successful! Your merch is on the way.');
            // navigateTo('home') will be triggered by form submit reload if not careful, 
            // but form target=_blank keeps us here. We can navigate manually after short delay.
            setTimeout(() => navigateTo('home'), 500);
        }
    };
    
    return container;
}


/* --- MAIN APP --- */

const app = document.getElementById('app');

const routes = {
    'auth': renderAuth,
    'home': renderHome,
    'calendar': renderCalendar,
    'profile': renderProfile,
    'social': renderSocial,
    'shop': renderShop,
    'checkout': renderCheckout,
    'admin': renderAdmin
};

window.navigateTo = function(route) {
    app.innerHTML = '';
    const user = store.getCurrentUser();
    if (!user && route !== 'auth') route = 'auth';

    // Banner
    const banner = document.createElement('div');
    banner.className = 'club-banner';
    banner.innerText = 'Ultra Mediocre Runners of Canberra';
    app.appendChild(banner);

    const renderFn = routes[route] || routes['home'];
    const view = renderFn(window.navigateTo);
    
    app.appendChild(createBackground());
    app.appendChild(view);
    if (user && route !== 'auth') app.appendChild(renderNavbar(route));
};

function createBackground() {
    const bg = document.createElement('div');
    bg.className = 'app-background';
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.zIndex = '-1';
    wrapper.appendChild(bg);
    return wrapper;
}

function renderNavbar(currentRoute) {
    const nav = document.createElement('div');
    nav.className = 'nav-bar';
    
    const items = [
        { icon: 'home', route: 'home', label: 'Home' },
        { icon: 'groups', route: 'social', label: 'Social' },
        { icon: 'event', route: 'calendar', label: 'Events' },
        { icon: 'shopping_bag', route: 'shop', label: 'Shop' },
        { icon: 'person', route: 'profile', label: 'Profile' }
    ];

    const user = store.getCurrentUser();
    if (user && user.role === 'admin') items.push({ icon: 'admin_panel_settings', route: 'admin', label: 'Admin' });

    // Persistent Logout in Nav
    items.push({ icon: 'logout', route: 'logout', label: 'Logout' });

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `nav-item ${currentRoute === item.route ? 'active' : ''}`;
        div.innerHTML = `<span class="material-icons-round">${item.icon}</span><span>${item.label}</span>`;
        div.onclick = () => {
             if (item.route === 'logout') {
                 store.logout();
                 window.navigateTo('auth');
             } else {
                 window.navigateTo(item.route);
             }
        };
        nav.appendChild(div);
    });
    return nav;
}

window.addEventListener('DOMContentLoaded', () => {
    // Async Init
    store.init().then(() => {
        const user = store.getCurrentUser();
        if (user) window.navigateTo('home');
        else window.navigateTo('auth');
    });
});
