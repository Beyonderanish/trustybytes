import os
import shutil
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional
from fastapi import File, UploadFile, Form

# --- DATABASE SETUP ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./deltabox.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DATABASE MODELS ---

class ArticleDB(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    content_type = Column(String, default="text")
    content_body = Column(Text)
    creator = Column(String)
    status = Column(String, default="draft") 
    media_url = Column(String, nullable=True)  # NEW: URL to the file
    media_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class GeneralCommentDB(Base):
    __tablename__ = "general_comments"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    text = Column(String)
    author = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ContextCommentDB(Base):
    __tablename__ = "context_comments"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    highlight_id = Column(String)
    text = Column(String)
    author = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- FASTAPI APP CONFIG ---
app = FastAPI(title="DeltaBox API")

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- PYDANTIC MODELS (JSON Schema) ---

class ArticleCreate(BaseModel):
    title: str
    content_body: str
    creator: str
    status: Optional[str] = "draft"
    content_type: Optional[str] = "text"
    description: Optional[str] = ""

class ContentUpdate(BaseModel):
    content_body: str

class StatusUpdate(BaseModel):
    status: str

class CommentCreate(BaseModel):
    article_id: int
    text: str
    author: str

class ContextCommentCreate(BaseModel):
    article_id: int
    highlight_id: str
    text: str
    author: str

# --- API ENDPOINTS ---

# 1. ARTICLES: CREATE (JSON)
# 1. ARTICLES: CREATE (JSON)
@app.post("/articles")
async def create_article(article: ArticleCreate, db: Session = Depends(get_db)):
    # Explicitly mapping fields ensures default values for media_url are None
    db_article = ArticleDB(
        title=article.title,
        description=article.description,
        content_body=article.content_body,
        creator=article.creator,
        status=article.status,
        content_type=article.content_type,
        media_url=None,   # Articles from Creator don't have media URLs yet
        media_type=None
    )
    db.add(db_article)
    try:
        db.commit()
        db.refresh(db_article)
        return db_article
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
# 2. ARTICLES: GET ALL
@app.get("/articles")
def get_articles(db: Session = Depends(get_db)):
    return db.query(ArticleDB).order_by(ArticleDB.created_at.desc()).all()

# 3. ARTICLES: GET ONE
@app.get("/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


# PATCH: content-only update — used by ViewDocument editor & highlight saves
class ContentPatch(BaseModel):
    content_body: str

@app.patch("/articles/{article_id}/content")
def patch_article_content(article_id: int, patch: ContentPatch, db: Session = Depends(get_db)):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.content_body = patch.content_body
    db.commit()
    db.refresh(article)
    return article


# PATCH: update only content_body (highlights + ViewDocument editor saves)
@app.put("/articles/{article_id}")
def update_article(article_id: int, update: ArticleCreate, db: Session = Depends(get_db)):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article.title = update.title
    article.content_body = update.content_body
    article.status = update.status
    db.commit()
    return {"status": "updated", "article_id": article_id}

# 5. ARTICLES: UPDATE STATUS ONLY
@app.put("/articles/{article_id}/status")
def update_article_status(article_id: int, status_update: StatusUpdate, db: Session = Depends(get_db)):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Not found")
    article.status = status_update.status
    db.commit()
    return {"status": "updated", "new_status": article.status}

# 6. ARTICLES: DELETE
@app.delete("/articles/{article_id}")
async def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Delete associated comments first to maintain integrity
    db.query(GeneralCommentDB).filter(GeneralCommentDB.article_id == article_id).delete()
    db.query(ContextCommentDB).filter(ContextCommentDB.article_id == article_id).delete()
    
    db.delete(article)
    db.commit()
    return {"status": "deleted", "article_id": article_id}

# 7. MEDIA UPLOAD
@app.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    safe_filename = f"{datetime.now().timestamp()}_{file.filename}"
    file_location = f"{UPLOAD_DIR}/{safe_filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://localhost:8000/static/{safe_filename}"}

# 8. COMMENTS: GENERAL
@app.get("/general-comments/{article_id}")
def get_general(article_id: int, db: Session = Depends(get_db)):
    return db.query(GeneralCommentDB).filter(GeneralCommentDB.article_id == article_id).all()

@app.post("/general-comments")
def post_general(c: CommentCreate, db: Session = Depends(get_db)):
    db_c = GeneralCommentDB(**c.dict())
    db.add(db_c)
    db.commit()
    db.refresh(db_c)
    return db_c

# 9. COMMENTS: CONTEXT NOTES
@app.get("/context-comments/{article_id}")
def get_context(article_id: int, db: Session = Depends(get_db)):
    return db.query(ContextCommentDB).filter(ContextCommentDB.article_id == article_id).all()

@app.post("/context-comments")
def post_context(c: ContextCommentCreate, db: Session = Depends(get_db)):
    db_c = ContextCommentDB(**c.dict())
    db.add(db_c)
    db.commit()
    db.refresh(db_c)
    return db_c

# DELETE context comment
@app.delete("/context-comments/{comment_id}")
def delete_context_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(ContextCommentDB).filter(ContextCommentDB.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"status": "deleted", "comment_id": comment_id}

# PUT (update text) context comment
class ContextCommentUpdate(BaseModel):
    text: str

@app.put("/context-comments/{comment_id}")
def update_context_comment(comment_id: int, update: ContextCommentUpdate, db: Session = Depends(get_db)):
    comment = db.query(ContextCommentDB).filter(ContextCommentDB.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.text = update.text
    db.commit()
    db.refresh(comment)
    return comment

# DELETE context comment
@app.post("/articles/post")
async def create_multimedia_post(
    title: str = Form("Untitled Post"),
    content_body: str = Form(...),
    creator: str = Form(...),
    content_type: str = Form("post"),
    status: str = Form("published"), # <--- 1. ADD THIS LINE
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    media_url = None
    media_type = None

    if file:
        safe_filename = f"{datetime.now().timestamp()}_{file.filename}"
        file_location = f"{UPLOAD_DIR}/{safe_filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        media_url = f"http://localhost:8000/static/{safe_filename}"
        media_type = file.content_type.split('/')[0] if "/" in file.content_type else "file"
        if file.content_type == "application/pdf":
            media_type = "pdf"

    db_article = ArticleDB(
        title=title,
        content_body=content_body,
        creator=creator,
        content_type=content_type,
        media_url=media_url,
        media_type=media_type,
        status=status # <--- 2. UPDATE THIS LINE TO USE THE VARIABLE
    )
    
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article

# REPLACE ATTACHMENT: saves edited HTML from DocumentEditor as the new media_url
# Does NOT touch content_body — keeps description clean
@app.put("/articles/{article_id}/replace-file")
async def replace_article_file(
    article_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    safe_filename = f"{datetime.now().timestamp()}_{file.filename}"
    file_location = f"{UPLOAD_DIR}/{safe_filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    article.title = title
    article.media_url = f"http://localhost:8000/static/{safe_filename}"
    article.media_type = "html"

    db.commit()
    db.refresh(article)
    return article

# Fix EditPost PUT: make content_type & status optional so DocumentEditor
# (which only sends title + file) doesn't get a 422 validation error
# 11. MULTIMEDIA POST UPDATE (Form Data with File)
@app.put("/articles/post/{article_id}")
async def update_multimedia_post(
    article_id: int,
    title: str = Form(...),
    content_body: str = Form(...),
    content_type: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.title = title
    article.content_body = content_body
    if content_type is not None:
        article.content_type = content_type
    if status is not None:
        article.status = status

    # If a new file is uploaded, replace the old media_url
    if file and file.filename:
        safe_filename = f"{datetime.now().timestamp()}_{file.filename}"
        file_location = f"{UPLOAD_DIR}/{safe_filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        article.media_url = f"http://localhost:8000/static/{safe_filename}"
        article.media_type = file.content_type.split('/')[0] if "/" in file.content_type else "file"
        if file.content_type == "application/pdf":
            article.media_type = "pdf"

    db.commit()
    db.refresh(article)
    return article
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)