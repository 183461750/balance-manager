FROM python:3.9-slim

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

EXPOSE 3000

CMD ["python", "app.py"]
# CMD ["tail", "-f", "/dev/null"]