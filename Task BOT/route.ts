import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { botToken, applicationId } = await request.json();

    if (!botToken || !applicationId) {
      return NextResponse.json(
        { error: 'Bot Token و Application ID الزامی هستند' },
        { status: 400 }
      );
    }

    const commands = [
      {
        name: 'task',
        description: 'مدیریت تسک‌ها',
        options: [
          {
            name: 'add',
            description: 'اضافه کردن تسک جدید',
            type: 1,
            options: [
              {
                name: 'title',
                description: 'عنوان تسک',
                type: 3,
                required: true,
              },
              {
                name: 'description',
                description: 'توضیحات تسک',
                type: 3,
                required: false,
              },
              {
                name: 'deadline',
                description: 'ددلاین به فرمت: YYYY-MM-DD HH:MM',
                type: 3,
                required: true,
              },
              {
                name: 'reminders',
                description: 'تعداد یادآوری (پیش‌فرض: 3)',
                type: 4,
                required: false,
                min_value: 1,
                max_value: 10,
              },
            ],
          },
          {
            name: 'list',
            description: 'نمایش لیست تسک‌ها',
            type: 1,
            options: [
              {
                name: 'status',
                description: 'وضعیت تسک‌ها',
                type: 3,
                required: false,
                choices: [
                  { name: 'فعال', value: 'active' },
                  { name: 'تکمیل شده', value: 'completed' },
                  { name: 'همه', value: 'all' },
                ],
              },
            ],
          },
          {
            name: 'complete',
            description: 'علامت‌گذاری تسک به عنوان تکمیل شده',
            type: 1,
            options: [
              {
                name: 'task_id',
                description: 'شناسه تسک',
                type: 4,
                required: true,
              },
            ],
          },
        ],
      },
    ];

    const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: 'دستورات Discord Bot با موفقیت ثبت شدند!',
    });
  } catch (error) {
    console.error('Error registering Discord commands:', error);
    return NextResponse.json(
      { error: 'خطا در ثبت دستورات Discord Bot', details: String(error) },
      { status: 500 }
    );
  }
}
