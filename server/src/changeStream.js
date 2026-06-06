const mongoose = require('mongoose');

/**
 * WebSocket broadcast helper — sends a serialized message to every
 * currently connected and OPEN WebSocket client.
 *
 * @param {import('ws').WebSocketServer} wss  The WebSocket server instance
 * @param {object} payload                     The data to broadcast
 */
function broadcast(wss, payload) {
  const message = JSON.stringify(payload);
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(message);
      sent++;
    }
  });
  return sent;
}

/**
 * Starts a MongoDB Change Stream on the 'orders' collection and
 * broadcasts every change event to all connected WebSocket clients.
 *
 * MongoDB Change Streams require:
 *  - A replica set or Atlas cluster (single-node replicas are fine for dev)
 *  - The driver connection to remain alive
 *
 * Change event types handled:
 *  - insert  → full document available
 *  - update  → updateDescription + fullDocument (via fullDocument: 'updateLookup')
 *  - delete  → documentKey (_id) available
 *  - replace → full replacement document
 *
 * @param {import('ws').WebSocketServer} wss
 */
function startChangeStream(wss) {
  // Watch the 'orders' collection across all operations
  const collection = mongoose.connection.collection('orders');

  const changeStream = collection.watch(
    [], // no pipeline filter — watch all changes
    {
      fullDocument: 'updateLookup', // include the full doc after an update
    }
  );

  changeStream.on('change', (change) => {
    const { operationType, fullDocument, documentKey, updateDescription } = change;

    console.log(`[ChangeStream] ${operationType} detected on orders`);

    let payload;

    switch (operationType) {
      case 'insert':
        payload = {
          type: 'INSERT',
          order: serializeDoc(fullDocument),
        };
        break;

      case 'update':
      case 'replace':
        payload = {
          type: 'UPDATE',
          order: fullDocument ? serializeDoc(fullDocument) : null,
          updatedFields: updateDescription?.updatedFields ?? {},
          id: documentKey._id.toString(),
        };
        break;

      case 'delete':
        payload = {
          type: 'DELETE',
          id: documentKey._id.toString(),
        };
        break;

      default:
        // drop, rename, invalidate — not relevant for the client
        return;
    }

    const clientCount = broadcast(wss, payload);
    console.log(`[ChangeStream] Broadcasted ${payload.type} to ${clientCount} client(s)`);
  });

  changeStream.on('error', (err) => {
    console.error('[ChangeStream] Error:', err.message);
  });

  changeStream.on('close', () => {
    console.warn('[ChangeStream] Stream closed — will not auto-restart in this demo');
  });

  console.log('[ChangeStream] Watching orders collection for changes...');
  return changeStream;
}

/**
 * Normalises a raw MongoDB document into a clean client-facing object.
 * Converts _id (ObjectId) to a string 'id' field.
 */
function serializeDoc(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

module.exports = { startChangeStream };
