-- SQL_STORED_PROCEDURE dbo.Count_ActiveCode_Update (modified 2012-04-21T07:53:24.810)


-- =============================================
-- Author:         <andy>
-- ALTER  date: <2010-01-26>
-- Description:  <激活 激活码>
-- =============================================
CREATE  PROCEDURE [dbo].[Count_ActiveCode_Update]
@ActiveCode Varchar(50),
@UserName varchar(50),
@ouototal INT output 
AS
  /*第一步：定义变量*/
  DECLARE @Count INT
  SET @ouototal=0
  
  /*第二步：检验当前激活码是否有效*/
  SELECT @Count=COUNT(*)  From Count_ActiveCode Where IsOpen=2  And  ActiveCode=@ActiveCode
  
  /*第三步：更新当前激活码*/
  If(@Count=1)
    Begin
      UPDATE dbo.Count_ActiveCode SET IsOpen=0,UserName=@UserName WHERE  ActiveCode=@ActiveCode
      Set @ouototal=1
    End

GO
