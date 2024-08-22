/** @type {import('next').NextConfig} */
const nextConfig = {
  exportPathMap: async function () {
    return {
      "/": { page: "/" },
      "/about": { page: "/about" },
      // Add other routes as needed
    };
  },
};

export default nextConfig;
