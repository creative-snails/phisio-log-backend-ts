**PhisioLog** is a health journaling app designed to help users log detailed information about their physiological state or condition. Users can track specific organs, symptoms, remedies, diets, and other health-related data. The app allows users to document their experiences, view entries on a calendar, and generate reports to analyze trends over time. For example, users can review their main physical concerns over the past year, identify potential causes, and evaluate the effectiveness of treatments.

### Tech Stack

#### Frontend

- **Framework**: React Native with Expo
  - **Reason**: Expo simplifies development with React Native by providing a set of tools and services that make it easier to build, deploy, and extend apps. It also supports web development, allowing for potential expansion to web platforms.
- **UI Library**: Vanilla styling
  - **Reason**: Using vanilla styling offers more flexibility in rendering components exactly as desired.
- **State Management**: Vanilla React state management
  - **Reason**: For simplicity and ease of use. If the state becomes complex, Zustand can be considered for its lightweight and easy-to-use nature compared to Redux.

#### Backend

- **Framework**: Node.js with Express.js
  - **Reason**: Efficient and scalable for building the backend.
- **GraphQL**: Added on top of the Express server
  - **Reason**: Provides flexible data fetching, strong typing, and real-time capabilities.
- **Database**: MongoDB (free tier)
  - **Reason**: The schema-less nature of MongoDB offers flexibility, allowing you to update the schema later without complex migrations. This flexibility is beneficial for evolving applications where data structures may change over time.

#### Authentication

- **JWT (JSON Web Tokens)** or **Passport.js**
  - **Reason**: JWT is simple and effective for secure user authentication. Passport.js offers a variety of authentication strategies and can be discussed further for the best fit.

#### Additional Tools

- **Cloud Storage**: AWS S3 (free tier)
  - **Reason**: To allow users to upload their own test results, such as PDFs and other files, ensuring they have all their health-related documents in one place.
- **Notifications**: OneSignal (free tier) VS Custom Solution
  - **OneSignal**: OneSignal is a robust and easy-to-implement solution for push notifications, with a free tier that should suffice for your initial needs. It handles the complexities of push notifications across different platforms, saving you development time.
  - **Custom Solution**: Given the small user base and relatively simple requirements, implementing a custom notification system is feasible. However, it may require more development effort and maintenance.

### Key Features

1. **Body and Organ Selection**: Use icons to break down the body into different sections such as skin, bone, muscle, and internal organs. Users can then select specific organs from these categories.
2. **Symptom and Pain Tracking**: Document symptoms, pain levels, and types of pain.
3. **Treatment and Alleviation Techniques**: Sections to log treatments and techniques tried.
4. **Calendar Integration**: Calendar view to track symptoms and treatments over time.
5. **Test Results**: Secure storage and display of medical test results.
6. **Data Privacy**: Implement advanced encryption methods such as AES-256 to ensure user data privacy and security.
7. **Automated Reports**: Implement a feature to periodically generate and email reports to users. This ensures they have a backup of their data in case the platform goes down. The reports can be in CSV, PDF, or JSON format, depending on user preference.

### Audio Input and Processing

- **Audio Capture**: Use a library like React Native Voice to capture audio input.
- **Speech-to-Text**: Google Cloud Speech-to-Text to convert audio to text.
- **Text Processing**: Send the transcribed text to the ChatGPT API (starting with GPT-3.5 Turbo for cost-effectiveness, with the option to switch to GPT-4 if needed).
- **JSON Structuring**: ChatGPT interprets the text and structures it into a JSON object.
- **User Confirmation**: The structured data is returned to the user for confirmation and manual alterations if necessary.
