import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemSettings from "@/models/SystemSettings";

// GET - Fetch system settings
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Find the settings document (should be only one)
    const settings = await SystemSettings.findOne({});

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No settings found. Please seed the database with default settings.",
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        website: settings.website,
        address: settings.address,
      },
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch settings",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT - Update system settings
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { supportEmail, supportPhone, website, address } = body;

    // Validate required fields
    if (!supportEmail || !supportPhone || !website || !address) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Find existing settings or create new ones
    let settings = await SystemSettings.findOne({});

    if (!settings) {
      // Create new settings if none exist
      settings = new SystemSettings({
        supportEmail,
        supportPhone,
        website,
        address,
      });
    } else {
      // Update existing settings
      settings.supportEmail = supportEmail;
      settings.supportPhone = supportPhone;
      settings.website = website;
      settings.address = address;
    }

    await settings.save();

    return NextResponse.json({
      success: true,
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        website: settings.website,
        address: settings.address,
      },
      message: "Settings updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update settings",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
