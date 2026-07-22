document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.edit-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const postId = this.dataset.id;
            const postDiv = document.getElementById(`post-${postId}`);
            const contentP = postDiv.querySelector('.post-content');
            const currentText = contentP.innerText;

            contentP.innerHTML = `
                <textarea class="form-control edit-textarea">${currentText}</textarea>
                <button class="btn btn-primary btn-sm mt-2 save-btn">Save</button>
            `;

            postDiv.querySelector('.save-btn').addEventListener('click', function() {
                const newContent = postDiv.querySelector('.edit-textarea').value;

                fetch(`/posts/${postId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ content: newContent })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.content !== undefined) {
                        contentP.innerText = data.content;
                    } else {
                        alert(data.error || 'Something went wrong.');
                    }
                });
            });
        });
    });

    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.dataset.id;
            const countSpan = this.querySelector('.like-count');

            fetch(`/posts/${postId}/like`, {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.like_count !== undefined) {
                    countSpan.innerText = data.like_count;
                } else {
                    alert(data.error || 'Something went wrong.');
                }
            });
        });
    });
});