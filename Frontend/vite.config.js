import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Binds
    host: "192.168.86.8", // Bind to all network interfaces, including your iMac's IP
    port: 5173, // Optional: specify the port
  },
});
