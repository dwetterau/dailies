source venv/bin/activate
pip install -r requirements.txt -t .
zip -r function.zip lambda_function.py lib.py requirements.txt  fsrs  fsrs-5.1.3.dist-info