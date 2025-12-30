-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, hash this!
    first_name VARCHAR(100),
    surname VARCHAR(100),
    nickname VARCHAR(100),
    role VARCHAR(20) DEFAULT 'member',
    dob DATE,
    gender VARCHAR(20),
    address TEXT,
    mobile VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_mobile VARCHAR(20),
    umnum VARCHAR(10),
    perm_race_num VARCHAR(10),
    race_history JSONB DEFAULT '[]',
    awards JSONB DEFAULT '[]',
    join_date DATE DEFAULT CURRENT_DATE,
    avatar TEXT
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    description TEXT,
    rsvps JSONB DEFAULT '[]'
);

-- Products Table (Shop)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image TEXT,
    options JSONB DEFAULT '[]' -- Sizes, prices
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending' -- placedWithSupplier, delivered etc mapped here
);

-- Initial Seed Data (Matching app.js defaultData)
INSERT INTO users (id, email, password, first_name, surname, nickname, role, dob, gender, address, mobile, emergency_contact_name, emergency_contact_mobile, umnum, perm_race_num, race_history, awards, join_date, avatar)
VALUES
('u1', 'admin@pump.com', 'admin', 'Elliot', 'Cooper', 'Bushy', 'admin', '1980-01-01', 'Other', '123 Psychedelic Lane, Mushroom Kingdom', '0400000000', 'Mama', '0411111111', '001', '11', '[{"name": "Ultra Trail 100", "date": "2020-05-20"}]', '[{"type": "Ultra Award", "year": "2022"}]', '2023-01-15', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Groovy'),
('u2', 'member@pump.com', 'password', 'Daisy', 'Chain', 'DayDream', 'member', '1995-06-15', 'Female', '42 Wallaby Way, Sydney', '0422222222', 'Peace', '0433333333', '245', '', '[]', '[]', '2025-01-01', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Daisy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, title, event_date, description, rsvps)
VALUES
('e1', 'Sufferfest', '2025-10-31 08:00:00', 'How many times can you run up Stockyard spur in 6hrs?', '[]'),
('e2', 'Grindfest', '2025-11-05 08:00:00', '6 hrs on the hard stuff.', '[]'),
('e3', 'Jingleballs', '2025-12-05 07:00:00', 'Bring Christmas cheer. We will supply the balls.', '[]')
ON CONFLICT (id) DO NOTHING;
