import { fetchAuthenticated } from "../firebase/api.js";

let contacts = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch contacts from the backend
    await loadContacts();
    
    // 2. Setup event listeners
    document.querySelector('.btn-add').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('contactForm').addEventListener('submit', handleFormSubmit);

    // Make filterContacts globally accessible for the onkeyup attribute
    window.filterContacts = function() {
        const input = document.getElementById('searchInput').value.toLowerCase();
        const items = document.querySelectorAll('.contact-item');
        
        items.forEach(contact => {
            const name = contact.querySelector('.name').innerText.toLowerCase();
            if (name.includes(input)) {
                contact.style.display = "flex";
            } else {
                contact.style.display = "none";
            }
        });
    };
});

async function loadContacts() {
    try {
        const userData = await fetchAuthenticated('/users/profile');
        if (userData && userData.contacts) {
            contacts = userData.contacts;
        } else {
            contacts = [];
        }
        renderContacts();
    } catch (error) {
        console.error("Error loading contacts:", error);
        const container = document.getElementById('contactsContainer');
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 2rem;">Failed to load contacts.</p>`;
        }
    }
}

function renderContacts() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (contacts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No contacts found. Click "Add Contact" to get started.</p>`;
        return;
    }

    // Group contacts by relation
    const grouped = {};
    contacts.forEach(c => {
        if (!grouped[c.relation]) grouped[c.relation] = [];
        grouped[c.relation].push(c);
    });

    Object.keys(grouped).forEach(relation => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'contact-group';
        
        let headerHTML = `<div class="group-header">`;
        if (relation === 'Primary Guardian') {
            headerHTML += `<i class="fas fa-star primary-star"></i> `;
        }
        headerHTML += `${relation}</div>`;
        groupDiv.innerHTML = headerHTML;

        grouped[relation].forEach(contact => {
            const row = document.createElement('div');
            row.className = 'contact-row contact-item';
            
            // Random default avatar icon
            const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random&color=fff`;

            row.innerHTML = `
                <div class="contact-info">
                    <img src="${fallbackAvatarUrl}" alt="${contact.name}" class="avatar">
                    <div class="details">
                        <h4 class="name">${contact.name}</h4>
                        <p>${contact.phone}</p>
                    </div>
                </div>
                <div class="actions">
                    <a href="tel:${contact.phone.replace(/\s+/g, '')}" class="btn btn-blue"><i class="fas fa-phone"></i> Call</a>
                    <a href="sms:${contact.phone.replace(/\s+/g, '')}" class="btn btn-blue"><i class="fas fa-comment"></i> Message</a>
                    <button class="btn btn-outline" onclick="window.editContact('${contact.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-delete" onclick="window.deleteContact('${contact.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
            groupDiv.appendChild(row);
        });
        
        container.appendChild(groupDiv);
    });
}

function openModal(contactId = null) {
    const modal = document.getElementById('contactModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('contactForm');
    
    if (contactId) {
        title.innerText = 'Edit Contact';
        const contact = contacts.find(c => c.id === contactId);
        if(contact) {
            document.getElementById('contactId').value = contact.id;
            document.getElementById('contactName').value = contact.name;
            document.getElementById('contactPhone').value = contact.phone;
            document.getElementById('contactRelation').value = contact.relation;
        }
    } else {
        title.innerText = 'Add New Contact';
        form.reset();
        document.getElementById('contactId').value = '';
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('contactModal').style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('saveContactBtn');
    submitBtn.innerText = 'Saving...';
    submitBtn.disabled = true;

    const id = document.getElementById('contactId').value;
    const name = document.getElementById('contactName').value;
    const phone = document.getElementById('contactPhone').value;
    const relation = document.getElementById('contactRelation').value;

    const newContact = {
        id: id || 'id_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        relation
    };

    let updatedContacts = [...contacts];
    if (id) {
        updatedContacts = updatedContacts.map(c => c.id === id ? newContact : c);
    } else {
        updatedContacts.push(newContact);
    }

    try {
        await fetchAuthenticated('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ contacts: updatedContacts })
        });
        
        contacts = updatedContacts;
        renderContacts();
        closeModal();
    } catch (error) {
        console.error("Failed to save contact", error);
        alert("Failed to save contact. Please check your network.");
    } finally {
        submitBtn.innerText = 'Save Contact';
        submitBtn.disabled = false;
    }
}

window.editContact = function(id) {
    openModal(id);
};

window.deleteContact = async function(id) {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    
    let updatedContacts = contacts.filter(c => c.id !== id);
    
    try {
        await fetchAuthenticated('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ contacts: updatedContacts })
        });
        
        contacts = updatedContacts;
        renderContacts();
    } catch (error) {
        console.error("Failed to delete contact", error);
        alert("Failed to delete contact.");
    }
};

window.toggleMenu = function() {
    const nav = document.getElementById('navMenu');
    if(nav) nav.classList.toggle('active');
};