-- SQL_STORED_PROCEDURE dbo.Mem_ActiveCode_Check (modified 2012-04-21T07:54:31.140)


CREATE   PROCEDURE Mem_ActiveCode_Check 
@ActiveCode Varchar(50),
@Ouototal varchar(50)='' output
AS
/*较验注册码是否有效*/
   Set @Ouototal='0'
  /*第一步：验证当前用户注册码是否正确*/
  Select @Ouototal=Count(*) FROM Mem_ActiveCode 
         WHERE  ActiveCode=@ActiveCode
               And BeginActivityDate<=GetDate()
               And EndActivityDate >=GetDate()
               And IsOpen <>0
GO
