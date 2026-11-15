SahayakSHG
Voice-First AI Assistant for Indian Women's Self-Help Groups

SahayakSHG is a web application prototype designed to help Self-Help
Group (SHG) leaders and members manage bulk orders, work allocation,
production progress, quality inspection, and transparent member earnings
through a simple, voice-first interface.
Project overview
The application demonstrates an end-to-end SHG order workflow:
1. Voice Order Intake -- A leader records or enters a customer
   order and reviews the product, quantity, and delivery deadline.
2. Work Allocation -- The leader distributes the order among SHG
   members and confirms that assigned quantities add up to the order
   total.
3. Order Progress & Quality -- Production is tracked separately
   from quality acceptance. Completed, pending, accepted, and rework
   quantities are shown distinctly.
4. Payout Summary -- Earnings are calculated from accepted pieces
   using a fixed rate per piece. The group reviews the payout before
   approval.
5. Member Audio Playback -- A member can review or listen to an
   individual earnings summary in a selected language.
The prototype also includes a welcome page and navigation between the
individual application pages.
Key features
- Voice-first order entry with a manual-entry fallback.
- Order transcription preview and editable order details.
- Member work allocation with quantity validation.
- Production progress tracking.
- Quality inspection and rework tracking.
- Transparent member-level and group-level payout calculations.
- Regional-language options for Telugu, Hindi, and Kannada.
- Individual audio earnings summary experience.
- Separate leader and member experiences, where implemented.
- Responsive layouts for desktop, tablet, and mobile.
Demonstration data
The following values are sample data for demonstrating the workflow.
They are not real member records or actual payments.

  Item                               Demonstration value
  Order                                  500 cotton bags
Members                                              4
Initial allocation per member               125 pieces
Completed production                        380 pieces
Pending production                          120 pieces
Accepted pieces                             360 pieces
Pieces requiring rework                      20 pieces
Rate per accepted piece                            ₹25
Total group payout                              ₹9,000
Meena Kumari's accepted pieces                      85
Meena Kumari's sample earnings                  ₹2,125
Payout calculation
Member earnings = Accepted pieces × Rate per piece

Group payout = Sum of all member earnings

For the demonstration order:
- Anjali Devi: 95 × ₹25 = ₹2,375
- Lakshmi N.: 90 × ₹25 = ₹2,250
- Meena Kumari: 85 × ₹25 = ₹2,125
- Rani Bai: 90 × ₹25 = ₹2,250
Total: 360 accepted pieces and ₹9,000.

Payout values should be treated as pending until group approval is
completed. The prototype must not imply that money has been transferred
unless a real payment integration confirms it.
Application pages
  Page                    Suggested route         Purpose
  Welcome / Home          /                     Introduces SahayakSHG
and starts the demo

  Voice Order Intake      /voice-intake         Creates and confirms an
order

  Work Allocation         /work-allocation      Assigns work to members

  Order Progress &        /order-progress       Tracks production and
Quality                                         inspection

  Payout Summary          /payout-summary       Calculates and approves
earnings
Member Audio Playback   /member-audio         Presents a member's
individual earnings
summary
The exact routes may differ depending on the implementation generated in
Google AI Studio. Update this table if the project uses different paths.
Technology
The intended frontend stack is:
- React
- TypeScript
- Tailwind CSS
Potential integrations include Google Gemini for language understanding,
speech-to-text for voice order intake, text-to-speech for spoken
earnings summaries, and Firebase or another backend for authentication
and persistent data.

Important: Only describe an integration as active if it has actually
been configured and tested. Demo or simulated functionality should be
identified clearly.
Getting started
The commands below are typical for a React and TypeScript project. Check
the generated project's package.json and use its scripts if they
differ.
Prerequisites
- Node.js (LTS version recommended)
- npm
- A code editor such as Visual Studio Code
Install dependencies
npm install
Configure environment variables
If the project requires API keys or service configuration, create a
.env.local file in the project root and add only the variables
required by the implementation.

Example format:
# Add only variables actually used by this project.
# Example:
# VITE_GEMINI_API_KEY=your_api_key_here
Do not commit API keys, passwords, service account files, or other
secrets to GitHub. Do not expose private credentials in frontend code.
For production use, route secret-bearing requests through a secure
backend.
Run the development server
npm run dev
Open the local URL printed in the terminal (commonly
http://localhost:5173 for Vite projects).
Create a production build
npm run build
If the project provides a preview script, test the production build
with:
npm run preview
Deployment
SahayakSHG can be deployed to a hosting platform such as Vercel after
confirming that the project builds successfully.

Typical deployment steps:
1. Push the project source code to a Git repository.
2. Import the repository into Vercel.
3. Set the framework preset and build settings according to the
   project's actual configuration.
4. Add required environment variables in the hosting platform's project
   settings.
5. Deploy and test all application routes.
6. Confirm that direct navigation and page refreshes work for each
   route.
Suggested Vercel project name: sahayakshg.

The displayed application brand should remain SahayakSHG, even
though the deployment project identifier is lowercase.
Accessibility and user experience
The interface is intended for SHG users with different levels of digital
literacy. Design priorities include:
- Large, clearly labeled touch targets.
- Simple navigation and familiar icons.
- Readable text and strong color contrast.
- Short instructions and clear status messages.
- Regional-language options.
- Audio support with a text alternative.
- Manual alternatives when voice services are unavailable.
Data, privacy, and safety
- Use sample data for demonstrations unless real data has been
  collected with appropriate consent.
- Do not expose one member's private earnings information to another
  member.
- Protect authentication credentials and API keys.
- Obtain consent before recording or processing voice data.
- Clearly distinguish AI-generated suggestions from leader-approved
  decisions.
- Keep payout calculations deterministic and auditable.
- Require group approval before marking a payout as approved.
- Do not claim that a payment has been made without confirmation from
  a payment provider.
Current prototype limitations
Before presenting or deploying the application, verify which
capabilities are genuinely connected. Depending on the implementation,
the following may be demo-only:
- Live speech recognition.
- Regional-language speech transcription.
- Text-to-speech playback.
- Persistent database storage.
- User authentication and role permissions.
- Real-time synchronization between devices.
- Actual payment processing.
A simulated feature should be labeled as a demo and must not be
presented as a completed external integration.
Testing checklist
- [ ] The welcome page opens correctly.
- [ ] Each of the five application pages can be opened independently.
- [ ] Navigation works between all pages.
- [ ] The application shows one full page at a time, not a collage.
- [ ] The order quantity is 500 pieces.
- [ ] Initial allocation totals 500 pieces.
- [ ] Production totals 380 completed and 120 pending pieces.
- [ ] Quality totals 360 accepted and 20 requiring rework.
- [ ] Individual payouts add up to ₹9,000.
- [ ] Meena Kumari's sample earnings equal ₹2,125.
- [ ] Payout approval is distinct from payment transfer.
- [ ] Voice and audio controls behave as documented.
- [ ] Demo-only features are labeled clearly.
- [ ] Layouts work on desktop and mobile.
- [ ] No API keys or private credentials are committed.
- [ ] No broken links, images, or console errors remain.
Project purpose
SahayakSHG aims to make SHG order management easier to understand and
coordinate. By combining voice-first interaction, transparent work
allocation, production visibility, and clear earnings records, the
prototype demonstrates how accessible digital tools can support women's
Self-Help Groups.
Project: SahayakSHG
Category: Voice-first AI assistant for Self-Help Groups
Project status: Hackathon prototype
