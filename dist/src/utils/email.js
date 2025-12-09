"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViolationAlertEmail = exports.sendViolationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendViolationEmail = async (recipients, data) => {
    if (recipients.length === 0)
        return;
    const subject = `Break Violation Alert: ${data.agentName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d9534f;">Break Violation Detected</h2>
            <p><strong>Agent:</strong> ${data.agentName}</p>
            <p><strong>Break Type:</strong> ${data.breakType}</p>
            <hr />
            <p><strong>Start Time:</strong> ${data.startTime.toLocaleString()}</p>
            <p><strong>End Time:</strong> ${data.endTime.toLocaleString()}</p>
            <hr />
            <p><strong>Expected Duration:</strong> ${data.expectedDuration} minutes</p>
            <p><strong>Actual Duration:</strong> ${data.actualDuration} minutes</p>
            <p style="color: #d9534f; font-weight: bold;"><strong>Violation Overstay:</strong> ${data.violationDuration} minutes</p>
            <p>Log in to <a href="https://workpulse.us">WorkPulse</a> for more details.</p>
            <br />
            <p><em>WorkPulse System</em></p>
        </div>
    `;
    try {
        await transporter.sendMail({
            from: `"WorkPulse System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: recipients,
            subject,
            html,
        });
        console.log(`Violation email sent to: ${recipients.join(', ')}`);
    }
    catch (error) {
        console.error('Error sending violation email:', error);
    }
};
exports.sendViolationEmail = sendViolationEmail;
const sendViolationAlertEmail = async (recipients, data) => {
    if (recipients.length === 0)
        return;
    const subject = `Break Overdue: ${data.agentName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #f39c12;">Break Overdue Alert</h2>
            <p><strong>Agent:</strong> ${data.agentName}</p>
            <p><strong>Break Type:</strong> ${data.breakType}</p>
            <hr />
            <p>The above agent's break has reached its expected end time and is now overdue. Please visit <a href="https://workpulse.us">WorkPulse</a> to review the session.</p>
            <br />
            <p><em>WorkPulse System</em></p>
        </div>
    `;
    try {
        await transporter.sendMail({
            from: `"WorkPulse System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: recipients,
            subject,
            html,
        });
        console.log(`Violation alert email sent to: ${recipients.join(', ')}`);
    }
    catch (error) {
        console.error('Error sending violation alert email:', error);
    }
};
exports.sendViolationAlertEmail = sendViolationAlertEmail;
