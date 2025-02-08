import * as admin from "firebase-admin";

const serviceAccount = require("../firebase-service-account.json");

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

admin.firestore().settings({ ignoreUndefinedProperties: true });

export const logError = async (
  error: Error,
  context: Record<string, any> = {}
) => {
  console.log(error);
  try {
    const errorLog = {
      timestamp: admin.firestore.Timestamp.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      environment: process.env.NODE_ENV,
    };

    await admin.firestore().collection("errors").add(errorLog);
  } catch (loggingError) {
    console.error("Error logging to Firebase:", loggingError);
    console.error("Original error:", error);
  }
};

export default app;
