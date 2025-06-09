import sys
from decimal import Decimal
import json
from flask import Flask, Response, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, datetime

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

app = Flask(__name__)
app.json_encoder = CustomJSONEncoder
app.config['JSON_AS_ASCII'] = False
CORS(app)
@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.json
        if not data or 'user_id' not in data or 'items' not in data:
            return json_response({'error': 'Необходим user_id и items'}, 400)

        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        for item in data['items']:
            cur.execute("SELECT quantity_in_stock FROM books WHERE id = %s", (item['book_id'],))
            book = cur.fetchone()
            if not book:
                return json_response({'error': f'Книга с ID {item["book_id"]} не найдена'}, 404)
            if book['quantity_in_stock'] < item['quantity']:
                return json_response({'error': f'Недостаточно книг с ID {item["book_id"]} на складе'}, 400)

        cur.execute("""
            INSERT INTO orders (user_id, total_amount, status)
            VALUES (%s, %s, 'processing')
            RETURNING id, order_date, total_amount, status
        """, (data['user_id'], data['total_amount']))
        order = cur.fetchone()

        for item in data['items']:
            cur.execute("SELECT price FROM books WHERE id = %s", (item['book_id'],))
            book_price = cur.fetchone()['price']

            cur.execute("""
                INSERT INTO order_items (order_id, book_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s)
            """, (order['id'], item['book_id'], item['quantity'], book_price))

            cur.execute("""
                UPDATE books 
                SET quantity_in_stock = quantity_in_stock - %s
                WHERE id = %s
            """, (item['quantity'], item['book_id']))

        conn.commit()
        return json_response({
            'order_id': order['id'],
            'order_date': order['order_date'].isoformat(),
            'total_amount': float(order['total_amount']),
            'status': order['status'],
            'message': 'Заказ успешно создан'
        }, 201)

    except Exception as e:
        conn.rollback()
        return json_response({'error': str(e)}, 500)
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()