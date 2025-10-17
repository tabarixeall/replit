import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        user="q_vdqb_user",
        password="NCuUCUNilg4MpdR1yN9rj743zR8URmEH",
        database="q_vdqb",
        host="dpg-d3lv0m8gjchc73codb8g-a.oregon-postgres.render.com",
        port=5432
    )
    # Test query
    result = await conn.fetch("SELECT NOW()")
    print(result)
    await conn.close()

asyncio.run(main())
