const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command('/approval-test', async ({ command, ack, client }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'approval_modal',
        title: {
          type: 'plain_text',
          text: 'Approval Request',
        },
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'approver_select',
            element: {
              type: 'users_select',
              action_id: 'approver',
            },
            label: {
              type: 'plain_text',
              text: 'Select Approver',
            },
          },
          {
            type: 'input',
            block_id: 'approval_text',
            element: {
              type: 'plain_text_input',
              action_id: 'text',
              multiline: true,
            },
            label: {
              type: 'plain_text',
              text: 'Approval Text',
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error opening view:', error);
  }
});

app.view('approval_modal', async ({ ack, view, client, body }) => {
  await ack();

  const values = view.state.values;
  const approver = values.approver_select.approver.selected_user;
  const approvalText = values.approval_text.text.value;
  const requester = body.user.id; 

  try {
    const dmResponse = await client.conversations.open({ users: approver });
    const channelId = dmResponse.channel.id;

    await client.chat.postMessage({
      channel: channelId,
      text: `Approval request from <@${requester}>: ${approvalText}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Approval Request*\n> ${approvalText}\nFrom: <@${requester}>`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Approve',
              },
              style: 'primary',
              action_id: 'approve',
              value: JSON.stringify({
                requester,
                approvalText,
              }),
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Reject',
              },
              style: 'danger',
              action_id: 'reject',
              value: JSON.stringify({
                requester,
                approvalText,
              }),
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error sending approval message:', error);
  }
});

app.action('approve', async ({ ack, action, client }) => {
  await ack();
  try {
    const payload = JSON.parse(action.value);
    const requester = payload.requester;

    const dmResponse = await client.conversations.open({ users: requester });
    await client.chat.postMessage({
      channel: dmResponse.channel.id,
      text: 'Your approval request has been *approved*!',
    });
  } catch (error) {
    console.error('Error handling approval:', error);
  }
});

app.action('reject', async ({ ack, action, client }) => {
  await ack();
  try {
    const payload = JSON.parse(action.value);
    const requester = payload.requester;

    const dmResponse = await client.conversations.open({ users: requester });
    await client.chat.postMessage({
      channel: dmResponse.channel.id,
      text: 'Your approval request has been *rejected*.',
    });
  } catch (error) {
    console.error('Error handling rejection:', error);
  }
});

(async () => {
  await app.start(process.env.PORT || 4000);
  console.log(`⚡️ Bot app is running on port ${process.env.PORT || 4000}!`);
})();
