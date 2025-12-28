/* --- STORE SERVICE --- */
const STORE_KEY = 'pump_data_v1';

const defaultData = {
    currentUser: null,
    users: [
        { 
            id: 'u1', 
            email: 'admin@pump.com', 
            password: 'admin', 
            firstName: 'Groovy', 
            nickname: 'The Boss', 
            role: 'admin', 
            emergencyContact: 'Mama (555-0199)',
            avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Groovy'
        },
        { 
            id: 'u2', 
            email: 'member@pump.com', 
            password: 'password', 
            firstName: 'Daisy', 
            nickname: 'DayDream', 
            role: 'member', 
            emergencyContact: 'Peace (555-0122)',
            avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Daisy'
        }
    ],
    events: [
        {
            id: 'e1',
            title: 'Full Moon Mushroom Hunt',
            date: '2025-10-31T20:00',
            description: 'Find the magic in the forest. Bring a flashlight!',
            rsvps: []
        },
        {
            id: 'e2',
            title: 'Tie-Dye Workshop',
            date: '2025-11-05T14:00',
            description: 'Bring your own white tees. We provide the colors.',
            rsvps: []
        }
    ],
    notifications: []
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

    login(email, password) {
        const user = this.data.users.find(u => u.email === email && u.password === password);
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
        return this.data.currentUser;
    }

    updateUser(id, updates) {
        const idx = this.data.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            this.data.users[idx] = { ...this.data.users[idx], ...updates };
            if (this.data.currentUser && this.data.currentUser.id === id) {
                this.data.currentUser = this.data.users[idx];
            }
            this.save();
        }
    }

    getEvents() {
        return this.data.events;
    }

    rsvp(eventId, status) {
        const user = this.getCurrentUser();
        if (!user) return;

        const evt = this.data.events.find(e => e.id === eventId);
        if (evt) {
            evt.rsvps = evt.rsvps.filter(r => r.userId !== user.id);
            evt.rsvps.push({ userId: user.id, status, timestamp: new Date().toISOString() });
            this.save();
        }
    }
}

const store = new Store();


/* --- VIEWS --- */

function renderAuth(navigateTo) {
    const container = document.createElement('div');
    container.className = 'content';
    container.style.textAlign = 'center';
    
    container.innerHTML = `
        <div class="card" style="margin-top: 50px;">
            <h1>PUMP</h1>
            <p style="font-size: 1.2rem; margin-bottom: 20px;">Peace, Love & Membership</p>
            <form id="login-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" placeholder="groovy@example.com" value="admin@pump.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="******" value="admin">
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
        const email = container.querySelector('#email').value;
        const password = container.querySelector('#password').value;
        const user = store.login(email, password);
        if (user) {
            navigateTo('home');
        } else {
            alert('Bummer! Wrong credentials.');
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
            <button class="btn btn-primary">Pay Dues via PayPal</button>
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
            <p style="font-weight: bold; color: var(--color-pink);">${new Date(evt.date).toDateString()}</p>
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
                alert(`You marked yourself as ${btn.dataset.val}!`);
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
        addBtn.onclick = () => alert('Admin: Open Add Event Modal (Mock)');
        container.appendChild(addBtn);
    }
    return container;
}

function renderProfile(navigateTo) {
    const user = store.getCurrentUser();
    if (!user) { navigateTo('auth'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `
        <div class="card" style="text-align: center;">
            <div style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid var(--color-yellow); margin: 0 auto; overflow: hidden; background: #fff;">
                <img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h2 style="color: var(--color-purple); margin-top: 10px;">${user.firstName}</h2>
            <p>"${user.nickname}"</p>
            <span style="background: var(--color-pink); color: white; padding: 2px 10px; border-radius: 10px; font-size: 0.8rem;">${user.role}</span>
        </div>
        <div class="card">
            <h3>Edit Details</h3>
            <form id="profile-form">
                <div class="form-group"><label>First Name</label><input type="text" id="fname" value="${user.firstName}"></div>
                <div class="form-group"><label>Nickname</label><input type="text" id="nname" value="${user.nickname}"></div>
                <div class="form-group"><label>Emergency Contact</label><input type="text" id="econtact" value="${user.emergencyContact || ''}"></div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
        </div>
        <div class="card"><button id="logout-btn" class="btn" style="background: #333; color: white;">Logout</button></div>
    `;

    container.querySelector('#logout-btn').addEventListener('click', () => { store.logout(); navigateTo('auth'); });
    container.querySelector('#profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        store.updateUser(user.id, {
            firstName: container.querySelector('#fname').value,
            nickname: container.querySelector('#nname').value,
            emergencyContact: container.querySelector('#econtact').value
        });
        alert('Profile Updated!');
        navigateTo('profile');
    });
    return container;
}

function renderAdmin(navigateTo) {
    const user = store.getCurrentUser();
    if (!user || user.role !== 'admin') { navigateTo('home'); return document.createElement('div'); }

    const container = document.createElement('div');
    container.className = 'content';
    container.innerHTML = `
        <h1>Club Command Center</h1>
        <div class="card">
            <h2>📢 Blast Communications</h2>
            <textarea id="msg-text" rows="4" placeholder="Hello {{nickname}}..."></textarea>
            <button id="send-btn" class="btn btn-primary">Send Blast</button>
        </div>
        <div class="card"><h2>👥 Member Management</h2><div id="members-list"></div></div>
    `;

    const membersList = container.querySelector('#members-list');
    store.data.users.forEach(u => {
        const row = document.createElement('div');
        row.style.borderBottom = '1px solid #ccc';
        row.style.padding = '10px 0';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        
        row.innerHTML = `
            <div><strong>${u.firstName}</strong> (${u.role})<br><span style="font-size: 0.8rem;">${u.email}</span></div>
            ${u.id !== user.id ? `<button class="toggle-role btn-secondary" style="padding: 5px;">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>` : ''}
        `;
        const toggleBtn = row.querySelector('.toggle-role');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                store.updateUser(u.id, { role: u.role === 'admin' ? 'member' : 'admin' });
                navigateTo('admin');
            }
        }
        membersList.appendChild(row);
    });

    container.querySelector('#send-btn').addEventListener('click', () => {
        alert('Blast Sent!');
    });
    return container;
}


/* --- MAIN APP --- */

const app = document.getElementById('app');

const routes = {
    'auth': renderAuth,
    'home': renderHome,
    'calendar': renderCalendar,
    'profile': renderProfile,
    'admin': renderAdmin
};

window.navigateTo = function(route) {
    app.innerHTML = '';
    const user = store.getCurrentUser();
    if (!user && route !== 'auth') route = 'auth';

    const renderFn = routes[route] || routes['home'];
    const view = renderFn(window.navigateTo);
    
    app.appendChild(createBackground());
    app.appendChild(view);
    if (user && route !== 'auth') app.appendChild(renderNavbar(route));
};

function createBackground() {
    const bg = document.createElement('div');
    bg.className = 'app-background';
    const overlay = document.createElement('div');
    overlay.className = 'overlay-pattern';
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.zIndex = '-1';
    
    wrapper.appendChild(bg);
    wrapper.appendChild(overlay);

    for (let i = 0; i < 6; i++) {
        const shroom = document.createElement('div');
        shroom.className = 'mushroom';
        shroom.style.left = Math.random() * 90 + '%';
        shroom.style.top = Math.random() * 90 + '%';
        shroom.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random()})`;
        wrapper.appendChild(shroom);
    }
    return wrapper;
}

function renderNavbar(currentRoute) {
    const nav = document.createElement('div');
    nav.className = 'nav-bar';
    
    const items = [
        { icon: 'home', route: 'home', label: 'Home' },
        { icon: 'event', route: 'calendar', label: 'Events' },
        { icon: 'person', route: 'profile', label: 'Profile' }
    ];

    const user = store.getCurrentUser();
    if (user && user.role === 'admin') items.push({ icon: 'admin_panel_settings', route: 'admin', label: 'Admin' });

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `nav-item ${currentRoute === item.route ? 'active' : ''}`;
        div.innerHTML = `<span class="material-icons-round">${item.icon}</span><span>${item.label}</span>`;
        div.onclick = () => window.navigateTo(item.route);
        nav.appendChild(div);
    });
    return nav;
}

window.addEventListener('DOMContentLoaded', () => {
    const user = store.getCurrentUser();
    if (user) window.navigateTo('home');
    else window.navigateTo('auth');
});
