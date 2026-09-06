const admin = require('firebase-admin');

async function main() {
    try {
        console.log("Initializing Firebase Admin...");
        admin.initializeApp({
            projectId: 'greecole' // Make sure this matches your project ID or FIRESTORE_EMULATOR_HOST is set
        });
        const db = admin.firestore();

        console.log("Fetching schools...");
        const schoolsSnapshot = await db.collection('ecoles').get();
        let totalMigrated = 0;

        for (const schoolDoc of schoolsSnapshot.docs) {
            const schoolId = schoolDoc.id;
            console.log(`Processing school: ${schoolId}`);

            const studentsRef = db.collection(`ecoles/${schoolId}/eleves`);
            const studentsSnapshot = await studentsRef.get();

            const batch = db.batch();
            let batchCount = 0;
            let schoolMigrated = 0;

            for (const studentDoc of studentsSnapshot.docs) {
                const data = studentDoc.data();
                
                let needsUpdate = false;
                let updateData = {};

                // 1. Check if academicYears is missing but academicYear exists
                if (!data.academicYears && data.academicYear) {
                    updateData.academicYears = [data.academicYear];
                    needsUpdate = true;
                }

                // 2. Check if enrollments array is missing or empty
                if (!data.enrollments || data.enrollments.length === 0) {
                    if (data.academicYear) {
                        updateData.enrollments = [{
                            schoolId: schoolId,
                            studentId: studentDoc.id,
                            academicYear: data.academicYear,
                            classId: data.classId || "",
                            status: data.status || "Actif",
                            tuitionFee: data.tuitionFee || 0,
                            amountDue: data.amountDue || 0,
                            tuitionStatus: data.tuitionStatus || "Non payé",
                            createdAt: new Date().toISOString(),
                            createdBy: 'migration-script'
                        }];
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    batch.update(studentDoc.ref, updateData);
                    batchCount++;
                    schoolMigrated++;
                    totalMigrated++;

                    if (batchCount >= 400) {
                        await batch.commit();
                        console.log(`Committed batch of ${batchCount} for school ${schoolId}`);
                        batchCount = 0;
                    }
                }
            }

            if (batchCount > 0) {
                await batch.commit();
                console.log(`Committed final batch of ${batchCount} for school ${schoolId}`);
            }

            console.log(`School ${schoolId}: Migrated ${schoolMigrated} students.`);
        }

        console.log(`Migration complete. Total students migrated: ${totalMigrated}`);

    } catch (e) {
        console.error("Error running migration:", e);
    }
}

main();
