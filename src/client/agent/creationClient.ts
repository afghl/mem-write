type CreationEditorStreamParams = {
  projectId: string;
  creationId: string;
  message: string;
};

export async function streamCreationEditor({
  projectId,
  creationId,
  message,
}: CreationEditorStreamParams) {
  return fetch(`/api/projects/${projectId}/creations/${creationId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}
