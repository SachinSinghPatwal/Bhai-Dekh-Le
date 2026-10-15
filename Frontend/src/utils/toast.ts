import toast from "react-hot-toast";

export const notifySuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: "rgba(18, 18, 22, 0.88)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#f4f4f5",
      fontSize: "13px",
      borderRadius: "12px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
      padding: "12px 18px",
    },
    iconTheme: {
      primary: "#a1a1aa", // clean neutral zinc/silver tone
      secondary: "#18181b",
    },
  });
};

export const notifyError = (message: string) => {
  toast.error(message, {
    style: {
      background: "rgba(24, 18, 18, 0.92)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(248, 113, 113, 0.2)",
      color: "#f4f4f5",
      fontSize: "13px",
      borderRadius: "12px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      padding: "12px 18px",
    },
    iconTheme: {
      primary: "#f87171",
      secondary: "#18181b",
    },
  });
};

export const notifyInfo = (message: string) => {
  toast(message, {
    style: {
      background: "rgba(18, 18, 22, 0.88)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#f4f4f5",
      fontSize: "13px",
      borderRadius: "12px",
      padding: "12px 18px",
    },
    icon: "ℹ️",
  });
};
