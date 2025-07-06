CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT DEFAULT NULL,
    charity_id INT DEFAULT NULL,
    comment TEXT NOT NULL,
    rating INT DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donor (id),
    FOREIGN KEY (charity_id) REFERENCES charity (id)
);

drop Table if exists feedback;