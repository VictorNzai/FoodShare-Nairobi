-- Food Donations Table
CREATE TABLE IF NOT EXISTS food_donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    expiry DATE NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    notes TEXT,
    status ENUM(
        'Pending',
        'Scheduled',
        'Picked Up',
        'Delivered',
        'Cancelled'
    ) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donor (id)
);

SELECT * FROM food_donations WHERE donor_id = 1;