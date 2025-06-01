
class Student {
  constructor(id, name, age, grade, subject) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.grade = grade;
    this.subject = subject;
  }
}

class StudentManager {
  constructor() {
    // DOM references
    this.form = document.getElementById('student-form');
    this.list = document.getElementById('student-list');
    this.filterInput = document.getElementById('filterSubject');
    this.submitBtn = document.getElementById('submitBtn');
    this.notification = document.getElementById('notification');
    this.lastDeleted = null;
    this.editingId = null;

    // Students data
    this.students = [];
    this.currentView = [];

    // Initialize
    this.init();
  }

  async init() {
    // Attach event listeners
    this.form.addEventListener('submit', e => this.handleSubmit(e));
    document.getElementById('sortByName').addEventListener('click', () => this.sortBy('name'));
    document.getElementById('sortByGrade').addEventListener('click', () => this.sortBy('grade'));
    document.getElementById('filterButton').addEventListener('click', () => this.filterStudents());

    // Optional: Export/Import
    this.addExportImportButtons();

    // Event delegation for edit/delete
    this.list.addEventListener('click', e => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('edit-btn')) {
        this.startEdit(id);
      } else if (e.target.classList.contains('delete-btn')) {
        this.deleteStudent(id);
      }
    });

    // Load students (simulate async)
    await this.loadStudents();
    this.render();
  }

  // --- Storage ---
  async loadStudents() {
    this.showNotification('Loading students...', 'info');
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          this.students = JSON.parse(localStorage.getItem('students')) || [];
          this.currentView = this.students;
        } catch (err) {
          this.students = [];
          this.showNotification('Failed to load students.', 'error');
        }
        this.hideNotification();
        resolve();
      }, 600);
    });
  }

  save() {
    try {
      localStorage.setItem('students', JSON.stringify(this.students));
    } catch (err) {
      this.showNotification('Failed to save students.', 'error');
    }
  }

  // --- Form Handling ---
  handleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const ageValue = document.getElementById('age').value.trim();
    const age = parseInt(ageValue, 10);
    const grade = document.getElementById('grade').value.trim();
    const subject = document.getElementById('subject').value.trim();

    // Enhanced validation
    if (!name || !name.replace(/\s/g, '')) {
      this.showNotification('Name cannot be empty.', 'error');
      document.getElementById('name').focus();
      return;
    }
    if (isNaN(age) || age < 3 || age > 120) {
      this.showNotification('Please enter a realistic age (3-120).', 'error');
      document.getElementById('age').focus();
      return;
    }
    if (!grade) {
      this.showNotification('Grade cannot be empty.', 'error');
      document.getElementById('grade').focus();
      return;
    }
    if (!subject) {
      this.showNotification('Subject cannot be empty.', 'error');
      document.getElementById('subject').focus();
      return;
    }

    if (this.editingId) {
      // Update existing
      this.students = this.students.map(student =>
        student.id === this.editingId ? { ...student, name, age, grade, subject } : student
      );
      this.editingId = null;
      this.submitBtn.textContent = 'Add Student';
      this.showNotification('Student updated!', 'success');
    } else {
      // Add new
      const id = Date.now().toString();
      const newStudent = new Student(id, name, age, grade, subject);
      this.students.push(newStudent);
      this.showNotification('Student added!', 'success');
    }

    this.save();
    this.render();
    this.form.reset();
    document.getElementById('name').focus();
  }

  // --- Rendering ---
  render(studentArray = this.students) {
    this.currentView = studentArray;
    this.list.innerHTML = '';

    if (studentArray.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;">No students found</td>`;
      this.list.appendChild(tr);
      return;
    }

    studentArray.forEach(({ id, name, age, grade, subject }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Name">${name}</td>
        <td data-label="Age">${age}</td>
        <td data-label="Grade">${grade}</td>
        <td data-label="Subject">${subject}</td>
        <td data-label="Actions">
          <button class="edit-btn" data-id="${id}">Edit</button>
          <button class="delete-btn" data-id="${id}">Delete</button>
        </td>
      `;
      this.list.appendChild(tr);
    });
  }

  // --- Edit/Delete ---
  startEdit(id) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    document.getElementById('name').value = student.name;
    document.getElementById('age').value = student.age;
    document.getElementById('grade').value = student.grade;
    document.getElementById('subject').value = student.subject;

    this.editingId = id;
    this.submitBtn.textContent = 'Update Student';
    document.getElementById('name').focus();
  }

  deleteStudent(id) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;
    if (confirm('Are you sure you want to delete this student?')) {
      this.students = this.students.filter(s => s.id !== id);
      this.save();
      this.render();
      if (this.editingId === id) {
        this.editingId = null;
        this.form.reset();
        this.submitBtn.textContent = 'Add Student';
      }
      // Store last deleted for undo
      this.lastDeleted = student;
      this.showNotification(
        'Student deleted! <button id="undoBtn" class="undo-btn">Undo</button>',
        'success',
        true // HTML content
      );
      // Attach undo handler
      setTimeout(() => {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.onclick = () => this.undoDelete();
      }, 50);
    }
  }

  undoDelete() {
    if (this.lastDeleted) {
      this.students.push(this.lastDeleted);
      this.save();
      this.render();
      this.showNotification('Delete undone.', 'success');
      this.lastDeleted = null;
    }
  }

  // --- Sort/Filter ---
  sortBy(field) {
    const sorted = [...this.currentView].sort((a, b) =>
      a[field].toString().localeCompare(b[field].toString(), undefined, { numeric: true })
    );
    this.render(sorted);
  }

  filterStudents() {
    const subject = this.filterInput.value.trim().toLowerCase();
    if (!subject) {
      this.render();
      return;
    }
    const filtered = this.students.filter(student =>
      student.subject.toLowerCase().includes(subject)
    );
    this.render(filtered);
  }

  // --- Notification System ---
  showNotification(msg, type = 'success', isHTML = false) {
    if (!this.notification) return;
    this.notification.innerHTML = isHTML ? msg : this.escapeHTML(msg);
    this.notification.className = `notification ${type}`;
    this.notification.setAttribute('aria-live', 'polite');
    this.notification.setAttribute('role', 'status');
    this.notification.classList.remove('visually-hidden');
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      this.hideNotification();
    }, 2500);
  }

  hideNotification() {
    if (!this.notification) return;
    this.notification.className = 'notification visually-hidden';
    this.notification.innerHTML = '';
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Export/Import ---
  addExportImportButtons() {
    // Export Button
    let exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) {
      exportBtn = document.createElement('button');
      exportBtn.id = 'exportBtn';
      exportBtn.type = 'button';
      exportBtn.textContent = 'Export JSON';
      exportBtn.style.marginLeft = '10px';
      document.querySelector('.actions').appendChild(exportBtn);
    }
    exportBtn.addEventListener('click', () => this.exportStudents());

    // Import Button & Input
    let importBtn = document.getElementById('importBtn');
    if (!importBtn) {
      importBtn = document.createElement('button');
      importBtn.id = 'importBtn';
      importBtn.type = 'button';
      importBtn.textContent = 'Import JSON';
      importBtn.style.marginLeft = '10px';
      document.querySelector('.actions').appendChild(importBtn);
    }
    let importInput = document.getElementById('importInput');
    if (!importInput) {
      importInput = document.createElement('input');
      importInput.id = 'importInput';
      importInput.type = 'file';
      importInput.accept = '.json,application/json';
      importInput.style.display = 'none';
      document.body.appendChild(importInput);
    }
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', e => this.importStudents(e));
  }

  exportStudents() {
    const dataStr = JSON.stringify(this.students, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "students.json";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    this.showNotification('Exported students as JSON.', 'success');
  }

  importStudents(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (Array.isArray(data) && data.every(s => s.id && s.name && s.age && s.grade && s.subject)) {
          this.students = data;
          this.save();
          this.render();
          this.showNotification('Students imported!', 'success');
        } else {
          throw new Error('Invalid data format.');
        }
      } catch (err) {
        this.showNotification('Failed to import: Invalid JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }
}

// Notification styles for undo button
const style = document.createElement('style');
style.textContent = `
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: #fff;
  padding: 12px 28px;
  border-radius: 6px;
  font-size: 1.1em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 10000;
  opacity: 0.97;
  transition: background 0.2s;
  min-width: 180px;
  text-align: left;
}
.notification.error {
  background: #ef4444;
}
.notification.info {
  background: #6366f1;
}
.notification .undo-btn {
  background: none;
  color: #fff;
  border: 1px solid #fff;
  border-radius: 4px;
  margin-left: 16px;
  padding: 2px 10px;
  cursor: pointer;
  font-size: 0.95em;
  text-decoration: underline;
}
.visually-hidden {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  border: 0;
}
`;
document.head.appendChild(style);

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new StudentManager();
});
