import tkinter as tk
from tkinter import messagebox
import string
import secrets
import pyperclip

class PasswordGenerator:
    def __init__(self, root):
        self.root = root
        self.root.title("Advanced Password Generator")
        self.root.geometry("400x500")
        self.root.resizable(False, False)
        self.root.configure(bg="#2c3e50")

        # variables
        self.password_len = tk.IntVar(value=12)
        self.use_upper = tk.BooleanVar(value=True)
        self.use_lower = tk.BooleanVar(value=True)
        self.use_digits = tk.BooleanVar(value=True)
        self.use_symbols = tk.BooleanVar(value=True)

        self.setup_ui()

    def setup_ui(self):
        # Title
        tk.Label(self.root, text="Password Generator", font=("Helvetica", 18, "bold"), 
                 bg="#2c3e50", fg="#ecf0f1").pack(pady=20)

        # Length selection
        tk.Label(self.root, text="Password Length:", bg="#2c3e50", fg="#bdc3c7").pack()
        tk.Scale(self.root, from_=8, to_=32, variable=self.password_len, orient=tk.HORIZONTAL, 
                 bg="#34495e", fg="white", length=250).pack(pady=5)

        # Options
        options_frame = tk.Frame(self.root, bg="#2c3e50")
        options_frame.pack(pady=10)

        tk.Checkbutton(options_frame, text="Include Uppercase (A-Z)", variable=self.use_upper, 
                       bg="#2c3e50", fg="white", selectcolor="#2c3e50").grid(row=0, column=0, sticky="w")
        tk.Checkbutton(options_frame, text="Include Lowercase (a-z)", variable=self.use_lower, 
                       bg="#2c3e50", fg="white", selectcolor="#2c3e50").grid(row=1, column=0, sticky="w")
        tk.Checkbutton(options_frame, text="Include Digits (0-9)", variable=self.use_digits, 
                       bg="#2c3e50", fg="white", selectcolor="#2c3e50").grid(row=2, column=0, sticky="w")
        tk.Checkbutton(options_frame, text="Include Symbols (@#$%)", variable=self.use_symbols, 
                       bg="#2c3e50", fg="white", selectcolor="#2c3e50").grid(row=3, column=0, sticky="w")

        # Generate Button
        tk.Button(self.root, text="GENERATE PASSWORD", command=self.generate, 
                  bg="#27ae60", fg="white", font=("Helvetica", 10, "bold"), width=20).pack(pady=20)

        # Result display
        self.result_entry = tk.Entry(self.root, font=("Helvetica", 14), bd=5, relief=tk.FLAT, justify='center')
        self.result_entry.pack(pady=5, padx=20, fill='x')

        # Strength label
        self.strength_label = tk.Label(self.root, text="", bg="#2c3e50", font=("Helvetica", 10))
        self.strength_label.pack()

        # Copy Button
        tk.Button(self.root, text="Copy to Clipboard", command=self.copy_to_clipboard, 
                  bg="#2980b9", fg="white", width=15).pack(pady=10)

    def generate(self):
        chars = ""
        if self.use_upper.get(): chars += string.ascii_uppercase
        if self.use_lower.get(): chars += string.ascii_lowercase
        if self.use_digits.get(): chars += string.digits
        if self.use_symbols.get(): chars += string.punctuation

        if not chars:
            messagebox.showwarning("Warning", "Please select at least one character type!")
            return

        length = self.password_len.get()
        password = ''.join(secrets.choice(chars) for _ in range(length))
        
        self.result_entry.delete(0, tk.END)
        self.result_entry.insert(0, password)
        self.check_strength(password)

    def check_strength(self, pwd):
        length = len(pwd)
        if length < 10:
            self.strength_label.config(text="Strength: Weak", fg="#e74c3c")
        elif length < 16:
            self.strength_label.config(text="Strength: Medium", fg="#f1c40f")
        else:
            self.strength_label.config(text="Strength: Strong", fg="#2ecc71")

    def copy_to_clipboard(self):
        pwd = self.result_entry.get()
        if pwd:
            pyperclip.copy(pwd)
            messagebox.showinfo("Success", "Password copied to clipboard!")

if __name__ == "__main__":
    root = tk.Tk()
    app = PasswordGenerator(root)
    root.mainloop()