# SahayakSHG
### Voice-First AI Assistant for Indian Women's Self-Help Groups

SahayakSHG is an AI-powered, voice-first platform designed to simplify the way Women's Self-Help Groups (SHGs) manage bulk orders, distribute work, monitor production, maintain quality, and calculate member earnings.

The platform aims to make digital order management accessible to women with different levels of digital literacy through regional-language support, simple navigation, voice interaction, and transparent records.

---

## About the Project

Women's Self-Help Groups often coordinate bulk orders, divide production work among members, track completed products, and calculate individual earnings manually.

These processes can become difficult to manage, especially when multiple members are involved and delivery deadlines are approaching.

SahayakSHG addresses these challenges through a unified digital platform that supports the complete order management process, from receiving an order to calculating member payouts.

Our goal is to make SHG operations more organized, transparent, and accessible.

---

## Key Features

### 1. Voice-Based Order Intake
- Record customer orders using voice input.
- Support regional-language interaction.
- Extract product details, quantities, and delivery deadlines.
- Allow users to review order information before confirmation.

### 2. Smart Work Allocation
- Distribute bulk orders among SHG members.
- Display assigned quantities for each member.
- Help leaders monitor individual workloads.
- Allow leaders to review and approve allocations.

### 3. Order Progress and Quality Tracking
- Monitor production progress.
- Display completed and pending quantities.
- Track accepted products and items requiring rework.
- Highlight approaching delivery deadlines.

### 4. Transparent Payout Management
- Calculate earnings based on accepted products.
- Display individual member earnings.
- Generate a group payout summary.
- Allow group review and approval before payout.

### 5. Member Audio Playback
- Provide individual earnings summaries.
- Support audio playback for members.
- Present earnings information in accessible language.
- Help members understand their work and payments.

---

## Application Workflow

The SahayakSHG platform follows a five-stage workflow:

1. **Order Intake:** The SHG leader records a customer order through voice input.
2. **Work Allocation:** The order is distributed among available SHG members.
3. **Progress Tracking:** Members' production progress and product quality are monitored.
4. **Payout Calculation:** Earnings are calculated using accepted product quantities.
5. **Audio Summary:** Members can listen to their individual earnings information.

---

## Technology Stack

The intended technology stack includes:

| Technology | Purpose |
|---|---|
| React | Frontend development |
| TypeScript | Type-safe application development |
| Tailwind CSS | User interface styling |
| Google Gemini | AI-powered language understanding, if integrated |
| Speech-to-Text | Voice-based order input, if integrated |
| Text-to-Speech | Audio earnings summaries, if integrated |
| Firebase | Authentication and data storage, if configured |

*The integrations listed above should be considered planned or intended until they are implemented and tested in the application.*

---

## User Interface Design

SahayakSHG follows a simple, mobile-friendly design approach focused on accessibility and ease of use.

The application includes five main screens:

1. Voice Order Intake
2. Work Allocation
3. Order Progress & Quality
4. Payout Summary
5. Member Audio Playback

### Design Principles
- Voice-first interaction.
- Simple and intuitive navigation.
- Large buttons and touch-friendly controls.
- Clear icons and readable text.
- Regional-language accessibility.
- Transparent member earnings information.
- Responsive layouts for different devices.

---

## Sample Demonstration

The following values illustrate how an order can be managed through the platform. They are sample data, not real customer or member records.

| Parameter | Sample Value |
|---|---:|
| Product | Cotton Bags |
| Total Order Quantity | 500 |
| Number of SHG Members | 4 |
| Initial Allocation per Member | 125 |
| Completed Production | 380 |
| Pending Production | 120 |
| Accepted Pieces | 360 |
| Pieces Requiring Rework | 20 |
| Rate per Accepted Piece | ₹25 |
| Total Group Payout | ₹9,000 |

### Sample Member Earnings

| SHG Member | Accepted Pieces | Earnings |
|---|---:|---:|
| Anjali Devi | 95 | ₹2,375 |
| Lakshmi N. | 90 | ₹2,250 |
| Meena Kumari | 85 | ₹2,125 |
| Rani Bai | 90 | ₹2,250 |
| **Total** | **360** | **₹9,000** |

**Earnings Formula:**

Member Earnings = Accepted Pieces × Rate per Piece

Group Payout = Sum of Individual Member Earnings

Only accepted products are included in the payout calculation.

---

## Project Structure

The application is organized around the following major modules:

```text
SahayakSHG/
│
├── public/
│   └── assets/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── .gitignore
