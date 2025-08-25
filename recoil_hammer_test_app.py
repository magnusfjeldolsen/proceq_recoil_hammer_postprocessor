import tkinter as tk
from tkinter import messagebox
from tkinter import ttk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
from PIL import ImageGrab
from PIL import Image
import platform

import win32clipboard
from io import BytesIO

# Define datasets
datasets = {
    "Horizontal": {
        "r": np.array([20, 25, 30, 35, 40, 45, 50, 54]),
        "fck": np.array([10, 17, 25, 33.7, 42.5, 52, 62, 70]),
    },
    "Vertical Downward": {
        "r": np.array([20, 25, 30, 35, 40, 45, 52]),
        "fck": np.array([15, 22, 30, 39, 48, 58, 70]),
    },
    "Vertical Upward": {
        "r": np.array([25, 30, 35, 40, 45, 50, 55]),
        "fck": np.array([10, 17, 25.5, 32, 43.5, 53.5, 64]),
    }
}

k1_table = {
    9: 1.67, 10: 1.62, 11: 1.58, 12: 1.55,
    13: 1.52, 14: 1.50, 15: 1.48
}

def interpolate(x, xs, ys):
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            x0, x1 = xs[i], xs[i + 1]
            y0, y1 = ys[i], ys[i + 1]
            return y0 + (x - x0) * (y1 - y0) / (x1 - x0)
    return None

def get_k1(n):
    if n < 9:
        return None
    return k1_table.get(n, 1.48)

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Concrete fck Interpolator")

        self.test_type = tk.StringVar(value="Horizontal")
        self.entries = []

        self.create_widgets()

    def create_widgets(self):
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True)

        left_frame = tk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, padx=10, pady=10)

        right_frame = tk.Frame(main_frame)
        right_frame.pack(side=tk.RIGHT, padx=10, pady=10)

        # Test type selection
        test_type_frame = tk.Frame(left_frame)
        test_type_frame.pack(pady=5)
        for t in datasets.keys():
            tk.Radiobutton(test_type_frame, text=t, variable=self.test_type, value=t).pack(side=tk.LEFT)

        # Entry fields
        self.entries_frame = tk.Frame(left_frame)
        self.entries_frame.pack()
        for _ in range(16):
            e = tk.Entry(self.entries_frame, width=10)
            e.pack(pady=2)
            self.entries.append(e)

        # Buttons
        button_frame = tk.Frame(left_frame)
        button_frame.pack(pady=5)
        tk.Button(button_frame, text="Paste R-values", command=self.paste_values).pack(side=tk.LEFT, padx=5)
        tk.Button(button_frame, text="Calculate fck", command=self.calculate).pack(side=tk.LEFT, padx=5)
        tk.Button(button_frame, text="Copy Results", command=self.copy_results).pack(side=tk.LEFT, padx=5)
        #tk.Button(button_frame, text="Copy Plot", command=self.copy_plot).pack(side=tk.LEFT, padx=5)
        tk.Button(button_frame, text="Copy Plot", command=self.copy_plot_to_clipboard).pack(side=tk.LEFT, padx=5)


        # Results display
        self.results_text = tk.Text(left_frame, height=20, width=60)
        self.results_text.pack(pady=10)

        # Plot
        self.figure, self.ax = plt.subplots(figsize=(5, 4))
        self.canvas = FigureCanvasTkAgg(self.figure, master=right_frame)
        self.canvas.get_tk_widget().pack()

    def paste_values(self):
        try:
            clipboard = self.root.clipboard_get()
            lines = clipboard.strip().splitlines()
            for i, entry in enumerate(self.entries):
                if i < len(lines):
                    entry.delete(0, tk.END)
                    entry.insert(0, lines[i])
                else:
                    entry.delete(0, tk.END)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to read clipboard: {e}")

    def calculate(self):
        xs = datasets[self.test_type.get()]["r"]
        ys = datasets[self.test_type.get()]["fck"]
        r_values = []
        fck_cube = []
        fck_cylinder = []

        for entry in self.entries:
            val = entry.get()
            if val:
                try:
                    r = float(val)
                    fck = interpolate(r, xs, ys)
                    if fck is not None:
                        r_values.append(r)
                        fck_cube.append(fck)
                        fck_cylinder.append(fck / 1.25)
                except ValueError:
                    continue

        n = len(fck_cylinder)
        self.results_text.delete(1.0, tk.END)

        if n < 9:
            self.results_text.insert(tk.END, "Error: At least 9 test values are required.\n")
            return

        mean_cylinder = np.mean(fck_cylinder)
        std_cylinder = np.std(fck_cylinder, ddof=1)
        min_cylinder = np.min(fck_cylinder)
        k1 = get_k1(n)

        fck_is1 = mean_cylinder - k1 * std_cylinder
        fck_is2 = min_cylinder + 4
        fck_is = min(fck_is1, fck_is2)

        # Print results
        self.results_text.insert(tk.END, f"{'R':>8} {'fck_cube150':>12} {'fck_cylinder':>14}\n")
        for r, fc, fc_cyl in zip(r_values, fck_cube, fck_cylinder):
            self.results_text.insert(tk.END, f"{r:8.2f} {fc:12.2f} {fc_cyl:14.2f}\n")

        self.results_text.insert(tk.END, "\n")
        self.results_text.insert(tk.END, f"n = {n}\n")
        self.results_text.insert(tk.END, f"k1 = {k1}\n")
        self.results_text.insert(tk.END, f"mean = {mean_cylinder:.2f}\n")
        self.results_text.insert(tk.END, f"std dev = {std_cylinder:.2f}\n")
        self.results_text.insert(tk.END, f"fck_is1 = {fck_is1:.2f}\n")
        self.results_text.insert(tk.END, f"fck_is2 = {fck_is2:.2f}\n")
        self.results_text.insert(tk.END, f"→ Final fck_is = {fck_is:.2f}\n")

        # Plotting
        self.ax.clear()
        self.ax.plot(xs, ys, 'bo-', label='Reference Curve')
        self.ax.plot(r_values, fck_cube, 'ro', label='Interpolated Points')
        self.ax.set_xlabel("R-value")
        self.ax.set_ylabel("fck cube 150")
        self.ax.legend()
        self.ax.grid(True)
        self.canvas.draw()

    def copy_results(self):
        text = self.results_text.get(1.0, tk.END)
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.root.update()

    def copy_plot(self):
        self.canvas.get_tk_widget().update()
        x = self.root.winfo_rootx() + self.canvas.get_tk_widget().winfo_x()
        y = self.root.winfo_rooty() + self.canvas.get_tk_widget().winfo_y()
        x1 = x + self.canvas.get_tk_widget().winfo_width()
        y1 = y + self.canvas.get_tk_widget().winfo_height()
        img = ImageGrab.grab(bbox=(x, y, x1, y1))
        img.show()  # Optional: show the image for confirmation

        # Copy to clipboard (Windows only)
        try:
            from io import BytesIO
            import win32clipboard

            output = BytesIO()
            img.convert("RGB").save(output, "BMP")
            data = output.getvalue()[14:]  # Skip 14-byte BMP header

            win32clipboard.OpenClipboard()
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
            win32clipboard.CloseClipboard()
        except Exception as e:
            messagebox.showerror("Clipboard Error", f"Could not copy image: {e}")

    def copy_plot_to_clipboard(self):
        try:
            buf = BytesIO()
            self.figure.savefig(buf, format='png')
            buf.seek(0)
            img = Image.open(buf)

            # Windows-only implementation for clipboard image copy
            if platform.system() == 'Windows':
                import win32clipboard
                from PIL import ImageWin

                output = BytesIO()
                img.convert("RGB").save(output, "BMP")
                data = output.getvalue()[14:]  # BMP header removal
                output.close()

                win32clipboard.OpenClipboard()
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
                win32clipboard.CloseClipboard()
                messagebox.showinfo("Copied", "Plot image copied to clipboard!")
            else:
                messagebox.showwarning("Unsupported OS", "Copy plot to clipboard is only supported on Windows.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to copy plot image: {e}")


# Run the application
root = tk.Tk()
app = App(root)
root.mainloop()
