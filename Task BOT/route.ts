import { NextRequest, NextResponse } from 'next/server';
import { DbConnection } from '@/spacetime_module_bindings';
import nacl from 'tweetnacl';

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

function verifyDiscordRequest(request: NextRequest, body: string): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error('DISCORD_PUBLIC_KEY is not set');
    return false;
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    console.error('Missing signature or timestamp headers');
    return false;
  }

  try {
    const message = timestamp + body;
    const isValid = nacl.sign.detached.verify(
      Buffer.from(message, 'utf8'),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    );

    return isValid;
  } catch (error) {
    console.error('Error verifying Discord signature:', error);
    return false;
  }
}

async function connectToSpacetime(): Promise<DbConnection> {
  return new Promise((resolve, reject) => {
    const host = process.env.SPACETIME_HOST || 'ws://127.0.0.1:3000';
    const dbName = process.env.SPACETIME_DB_NAME || 'task-manager';

    const client = DbConnection.builder()
      .withUri(host)
      .withModuleName(dbName)
      .onConnect(() => {
        resolve(client);
      })
      .onError((error: string) => {
        reject(new Error(error));
      })
      .build();
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const isValid = verifyDiscordRequest(request, body);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { data } = interaction;
      const subcommand = data.options?.[0];

      if (data.name === 'task') {
        const client = await connectToSpacetime();

        try {
          if (subcommand.name === 'add') {
            const title = subcommand.options?.find((opt: { name: string }) => opt.name === 'title')?.value || '';
            const description = subcommand.options?.find((opt: { name: string }) => opt.name === 'description')?.value || '';
            const deadlineStr = subcommand.options?.find((opt: { name: string }) => opt.name === 'deadline')?.value || '';
            const reminderCount = subcommand.options?.find((opt: { name: string }) => opt.name === 'reminders')?.value || 3;

            const deadlineDate = new Date(deadlineStr.replace(' ', 'T'));
            if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
              return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '❌ فرمت تاریخ نادرست یا ددلاین در گذشته است! فرمت صحیح: YYYY-MM-DD HH:MM',
                  flags: 64,
                },
              });
            }

            client.reducers.createTask(title, description, BigInt(deadlineDate.getTime()), Number(reminderCount));

            await new Promise((resolve) => setTimeout(resolve, 500));
            client.disconnect();

            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                embeds: [
                  {
                    title: '✅ تسک جدید اضافه شد!',
                    fields: [
                      { name: 'عنوان', value: title, inline: false },
                      { name: 'توضیحات', value: description || 'ندارد', inline: false },
                      { name: 'ددلاین', value: deadlineDate.toLocaleString('fa-IR'), inline: true },
                      { name: 'تعداد یادآوری', value: String(reminderCount), inline: true },
                    ],
                    color: 0x00ff00,
                  },
                ],
              },
            });
          } else if (subcommand.name === 'list') {
            const statusFilter = subcommand.options?.find((opt: { name: string }) => opt.name === 'status')?.value || 'all';

            await new Promise((resolve) => setTimeout(resolve, 300));

            const tasks = Array.from(client.db.task.iter());
            const filteredTasks = tasks.filter((task) => {
              if (statusFilter === 'all') return true;
              if (statusFilter === 'active') return task.status.tag === 'Active';
              if (statusFilter === 'completed') return task.status.tag === 'Completed';
              return true;
            });

            client.disconnect();

            if (filteredTasks.length === 0) {
              return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '📋 هیچ تسکی یافت نشد!',
                  flags: 64,
                },
              });
            }

            const taskList = filteredTasks
              .slice(0, 10)
              .map((task) => {
                const deadline = new Date(Number(task.deadlineMs));
                const statusEmoji = task.status.tag === 'Active' ? '🟢' : '✅';
                return `${statusEmoji} **${task.title}** (ID: ${task.id})\n└ ددلاین: ${deadline.toLocaleString('fa-IR')}`;
              })
              .join('\n\n');

            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                embeds: [
                  {
                    title: '📋 لیست تسک‌ها',
                    description: taskList,
                    color: 0x0099ff,
                    footer: {
                      text: `مجموع: ${filteredTasks.length} تسک`,
                    },
                  },
                ],
              },
            });
          } else if (subcommand.name === 'complete') {
            const taskId = subcommand.options?.find((opt: { name: string }) => opt.name === 'task_id')?.value;

            if (!taskId) {
              return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '❌ شناسه تسک الزامی است!',
                  flags: 64,
                },
              });
            }

            client.reducers.completeTask(BigInt(taskId));
            await new Promise((resolve) => setTimeout(resolve, 500));
            client.disconnect();

            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                embeds: [
                  {
                    title: '✅ تسک تکمیل شد!',
                    description: `تسک با ID ${taskId} به عنوان تکمیل شده علامت‌گذاری شد.`,
                    color: 0x00ff00,
                  },
                ],
              },
            });
          }
        } catch (error) {
          client.disconnect();
          throw error;
        }
      }
    }

    return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
  } catch (error) {
    console.error('Error handling Discord interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
