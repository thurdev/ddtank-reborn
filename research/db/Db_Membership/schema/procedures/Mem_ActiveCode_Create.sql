-- SQL_STORED_PROCEDURE dbo.Mem_ActiveCode_Create (modified 2012-04-21T07:54:31.140)






CREATE      PROCEDURE [dbo].[Mem_ActiveCode_Create] 
@ApplicationName Varchar(256),
@Company Varchar(256),
@LoneDay Int,
@Counts Int
AS
/*生成注册码:输入游戏名称、发放公司、有较时间、发放数量*/
  /*第一步:获取游戏分类编号*/
  Declare @ApplicationId Integer
  Declare @Num Integer
  Declare @ActiveCode Varchar(50)
  SELECT @ApplicationId=ApplicationId FROM Mem_Application WHERE  ApplicationName=@ApplicationName
  
  /*第二步:生成游戏*/

    SET @Num=0 
    WHILE @Num<@Counts
    BEGIN
      SET @ActiveCode=Replace(Replace(NEWID(),'{',''),'}','')
      INSERT INTO Mem_ActiveCode(ApplicationId,ActiveCode,  BeginActivityDate, EndActivityDate, IsOpen,Company) VALUES(@ApplicationId,@ActiveCode,GETDATE(),GETDATE()+@LoneDay,2,@Company) 
      SET @Num=@Num+1 
    END 
 






GO
