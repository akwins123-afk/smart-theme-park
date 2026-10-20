/**
 * Centralized Database Error Handler
 * Translates low-level MySQL error codes (1062, 1452, 3819, 45000)
 * into structured explanations highlighting the exact relational constraint,
 * trigger, or check rule enforcing the integrity.
 */

function formatDatabaseError(err) {
    console.error('Database Error Intercepted:', {
        errno: err.errno,
        code: err.code,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage
    });

    const errorDetails = {
        success: false,
        isDatabaseError: true,
        code: err.code || 'UNKNOWN_DB_ERROR',
        errno: err.errno || 0,
        sqlState: err.sqlState || 'HY000',
        rawMessage: err.sqlMessage || err.message,
        title: 'Database Constraint Violation',
        explanation: 'An operation was rejected by the database integrity rules.',
        violatedRule: 'Integrity Constraint',
        enforcedBy: 'MySQL Relational Engine'
    };

    // 1. SIGNAL SQLSTATE '45000' (Triggers & Stored Procedures)
    if (err.sqlState === '45000' || err.errno === 1644) {
        const msg = err.sqlMessage || '';
        errorDetails.title = 'Database Business Rule Enforced';

        if (msg.includes('Overlapping virtual queue slot')) {
            errorDetails.explanation = 'A visitor cannot hold more than one active virtual queue reservation for overlapping time intervals. You already have a pass booked during this window.';
            errorDetails.violatedRule = 'Rule 4.1: No Overlapping Virtual Queue Slots';
            errorDetails.enforcedBy = 'BEFORE INSERT Trigger: trg_no_overlapping_queue_pass on Virtual_Queue_Pass';
        } else if (msg.includes('Insufficient wallet balance')) {
            errorDetails.explanation = 'The transaction amount exceeds the live wallet balance of this wristband. Contactless wallets cannot be overdrawn.';
            errorDetails.violatedRule = 'Rule 2.2: Non-negative Prepaid Balance Enforced';
            errorDetails.enforcedBy = 'BEFORE INSERT Trigger: trg_wallet_transaction_apply on Wallet_Transaction';
        } else if (msg.includes('Safety check failed') || msg.includes('height')) {
            errorDetails.explanation = msg;
            errorDetails.violatedRule = 'Rule 3.1: Attraction Safety Height Verification';
            errorDetails.enforcedBy = 'Stored Procedure: sp_ride_tap_in / sp_book_queue_pass';
        } else if (msg.includes('occupied by another visitor')) {
            errorDetails.explanation = 'Smart locker is already rented. Lockers enforce strict single-visitor occupancy.';
            errorDetails.violatedRule = 'Rule 5.1: Single Active Visitor Per Locker';
            errorDetails.enforcedBy = 'Stored Procedure: sp_rent_locker';
        } else if (msg.includes('already holds an active locker')) {
            errorDetails.explanation = 'Each wristband can only hold one active locker rental at any given time. Release your current locker first.';
            errorDetails.violatedRule = 'Rule 5.2: Maximum 1 Active Locker per Wristband';
            errorDetails.enforcedBy = 'Stored Procedure: sp_rent_locker';
        } else if (msg.includes('Inactive or Lost') || msg.includes('Wristband is')) {
            errorDetails.explanation = 'The RFID wristband status is Inactive or Lost. Contact Park Guest Relations at the Main Entrance.';
            errorDetails.violatedRule = 'Rule 1.3: Active Wristband Status Required';
            errorDetails.enforcedBy = 'Database Stored Procedures & Triggers';
        } else {
            errorDetails.explanation = msg;
            errorDetails.violatedRule = 'Stored Procedure Assertion';
            errorDetails.enforcedBy = 'Database Business Procedure';
        }
        return errorDetails;
    }

    // 2. ER_DUP_ENTRY (1062) - UNIQUE Key Violation
    if (err.errno === 1062) {
        errorDetails.title = 'Unique Key Violation (Duplicate Entry)';
        const msg = err.sqlMessage || '';
        
        if (msg.includes('Band_UID')) {
            errorDetails.explanation = 'This RFID Wristband UID is already assigned to another visitor in the park.';
            errorDetails.violatedRule = '1:1 Wristband-to-Visitor Mapping (UNIQUE Band_UID)';
            errorDetails.enforcedBy = 'Table Constraint: UNIQUE(Band_UID) on RFID_Wristband';
        } else if (msg.includes('Visitor_ID')) {
            errorDetails.explanation = 'This visitor already has an assigned wristband. A visitor can possess only one wristband.';
            errorDetails.violatedRule = '1:1 Wristband-to-Visitor Mapping (UNIQUE Visitor_ID)';
            errorDetails.enforcedBy = 'Table Constraint: UNIQUE(Visitor_ID) on RFID_Wristband';
        } else if (msg.includes('uq_locker_zone_num') || (msg.includes('Zone') && msg.includes('Number'))) {
            errorDetails.explanation = 'A locker with this Number already exists within the specified Zone.';
            errorDetails.violatedRule = 'Locker Identification (Composite UNIQUE Zone + Number)';
            errorDetails.enforcedBy = 'Table Constraint: uq_locker_zone_num on Locker';
        } else if (msg.includes('Email')) {
            errorDetails.explanation = 'This email address is already registered to another park visitor profile.';
            errorDetails.violatedRule = 'Unique Visitor Demographic (UNIQUE Email)';
            errorDetails.enforcedBy = 'Table Constraint: UNIQUE(Email) on Visitor';
        } else {
            errorDetails.explanation = `A record with this unique identifier already exists (${msg}).`;
            errorDetails.violatedRule = 'Relational Candidate Key Uniqueness';
            errorDetails.enforcedBy = 'MySQL PRIMARY/UNIQUE Key Constraint';
        }
        return errorDetails;
    }

    // 3. ER_NO_REFERENCED_ROW_2 (1452) - Foreign Key Constraint Failed
    if (err.errno === 1452) {
        errorDetails.title = 'Foreign Key Referential Integrity Failure';
        errorDetails.explanation = 'The operation references a parent record that does not exist in the database.';
        errorDetails.violatedRule = 'Referential Integrity: Referenced Entity Must Exist';
        errorDetails.enforcedBy = 'FOREIGN KEY Constraint with ON DELETE RESTRICT/CASCADE';
        return errorDetails;
    }

    // 4. ER_ROW_IS_REFERENCED_2 (1451) - Cannot Delete Row with Children
    if (err.errno === 1451) {
        errorDetails.title = 'Cascading Referential Integrity Guard';
        errorDetails.explanation = 'Cannot delete or alter this record because other tables currently reference it.';
        errorDetails.violatedRule = 'Referential Integrity: Child Records Exist';
        errorDetails.enforcedBy = 'FOREIGN KEY ON DELETE RESTRICT';
        return errorDetails;
    }

    // 5. ER_CHECK_CONSTRAINT_VIOLATED (3819) - CHECK Constraint Violation
    if (err.errno === 3819) {
        errorDetails.title = 'CHECK Constraint Violated';
        const msg = err.sqlMessage || '';

        if (msg.includes('chk_height_band')) {
            errorDetails.explanation = 'Maximum ride height must be greater than or equal to minimum ride height, and minimum height must be strictly positive.';
            errorDetails.violatedRule = 'CHECK (Max_Height_cm >= Min_Height_cm AND Min_Height_cm > 0.0)';
            errorDetails.enforcedBy = 'Attraction Table CHECK Constraint: chk_height_band';
        } else if (msg.includes('chk_balance')) {
            errorDetails.explanation = 'Wallet balance cannot drop below zero.';
            errorDetails.violatedRule = 'CHECK (Wallet_Balance >= 0.00)';
            errorDetails.enforcedBy = 'RFID_Wristband Table CHECK Constraint: chk_balance';
        } else if (msg.includes('chk_slot_time')) {
            errorDetails.explanation = 'Virtual queue slot end time must be later than slot start time.';
            errorDetails.violatedRule = 'CHECK (Slot_End_Time > Slot_Start_Time)';
            errorDetails.enforcedBy = 'Virtual_Queue_Pass Table CHECK Constraint: chk_slot_time';
        } else if (msg.includes('chk_visitor_height')) {
            errorDetails.explanation = 'Visitor height must be greater than zero cm.';
            errorDetails.violatedRule = 'CHECK (Height_cm > 0.0)';
            errorDetails.enforcedBy = 'Visitor Table CHECK Constraint: chk_visitor_height';
        } else {
            errorDetails.explanation = `A database domain CHECK constraint prevented invalid data: ${msg}`;
            errorDetails.violatedRule = 'Table Domain CHECK Rule';
            errorDetails.enforcedBy = 'MySQL CHECK Constraint';
        }
        return errorDetails;
    }

    // Fallback for other errors
    errorDetails.explanation = err.sqlMessage || err.message;
    return errorDetails;
}

module.exports = {
    formatDatabaseError
};
