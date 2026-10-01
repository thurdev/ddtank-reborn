-- SQL_STORED_PROCEDURE dbo.Mem_ActiveCode_Lost (modified 2012-04-21T07:54:31.140)

CREATE  PROCEDURE Mem_ActiveCode_Lost
@ActiveCode Varchar(50)
AS
/*激活码验证无效后。设置当前激活码设为无效*/
  Update Mem_ActiveCode Set IsOpen=0 Where  ActiveCode=@ActiveCode


GO
