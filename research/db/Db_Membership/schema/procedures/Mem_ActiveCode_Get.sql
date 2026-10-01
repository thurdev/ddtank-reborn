-- SQL_STORED_PROCEDURE dbo.Mem_ActiveCode_Get (modified 2012-04-21T07:54:31.140)





CREATE      PROCEDURE Mem_ActiveCode_Get 
@ApplicationName Varchar(256),
@ActiveCode Varchar(50) Output
AS
/*获取注册码*/
   /*第一步：定义站点Id*/
   DECLARE @ApplicationId INT
   Set @ActiveCode=0
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName
   /*第二步:获取激活码*/
   SELECT Top 1 @ActiveCode=ActiveCode FROM Mem_ActiveCode 
          Where ApplicationId=@ApplicationId 
                And Company='7Road' 
                And IsOpen=2 
                And BeginActivityDate<=Getdate()
                And EndActivityDate>=Getdate()

   /*第三步:设置当前激活码被人邻走*/
   Update Mem_ActiveCode Set IsOpen=1 Where ActiveCode=@ActiveCode
GO
