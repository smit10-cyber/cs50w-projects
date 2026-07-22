document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // Handle the compose form being submitted
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(recipients = '', subject = '', body = '') {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out any previous error message
  document.querySelector('#compose-error').innerHTML = '';

  // Fill in composition fields (blank by default, or pre-filled for a reply)
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;
}

function send_email(event) {

  // Stop the form from reloading the page
  event.preventDefault();

  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log(result);

    if (result.error) {
      // Show the error instead of switching views
      document.querySelector('#compose-error').innerHTML = result.error;
    } else {
      // Once sent successfully, load the Sent mailbox
      load_mailbox('sent');
    }
  });
}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch emails for this mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    console.log(emails);

    emails.forEach(email => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${email.sender}</strong> ${email.subject} <span style="float:right">${email.timestamp}</span>`;
      div.style.border = '1px solid black';
      div.style.padding = '10px';
      div.style.marginBottom = '5px';
      div.style.backgroundColor = email.read ? '#e9e9e9' : 'white';
      div.style.cursor = 'pointer';

      // Clicking an email opens it (pass along which mailbox it came from)
      div.addEventListener('click', () => view_email(email.id, mailbox));

      document.querySelector('#emails-view').append(div);
    });
  });
}

function view_email(email_id, mailbox) {

  // Fetch the full email
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {

    // Show the email view, hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-view').style.display = 'block';

    // Fill in the email details
    document.querySelector('#email-view').innerHTML = `
      <p><strong>From:</strong> ${email.sender}</p>
      <p><strong>To:</strong> ${email.recipients.join(', ')}</p>
      <p><strong>Subject:</strong> ${email.subject}</p>
      <p><strong>Timestamp:</strong> ${email.timestamp}</p>
      <hr>
      <p>${email.body}</p>
    `;

    // Reply button
    const replyButton = document.createElement('button');
    replyButton.className = 'btn btn-sm btn-outline-primary';
    replyButton.innerHTML = 'Reply';
    replyButton.addEventListener('click', () => {

      // Pre-fill recipient with the original sender
      const recipients = email.sender;

      // Pre-fill subject, avoiding double "Re: "
      let subject = email.subject;
      if (!subject.startsWith('Re: ')) {
        subject = `Re: ${subject}`;
      }

      // Pre-fill body with an attribution line, then the original text
      const body = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n\n`;

      compose_email(recipients, subject, body);
    });
    document.querySelector('#email-view').append(replyButton);

    // Add archive/unarchive button, but only for inbox/archive mailboxes (not sent)
    if (mailbox !== 'sent') {
      const archiveButton = document.createElement('button');
      archiveButton.className = 'btn btn-sm btn-outline-secondary';
      archiveButton.innerHTML = email.archived ? 'Unarchive' : 'Archive';
      archiveButton.addEventListener('click', () => {
        fetch(`/emails/${email_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: !email.archived
          })
        })
        .then(() => {
          // Once archived/unarchived, go back to the inbox
          load_mailbox('inbox');
        });
      });
      document.querySelector('#email-view').append(archiveButton);
    }

    // Mark the email as read
    fetch(`/emails/${email_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    });
  });
}