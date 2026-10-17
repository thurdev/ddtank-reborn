-- SQL_SCALAR_FUNCTION dbo.fn_GetFilePath (modified 2025-11-03T04:46:08.190)








/**//*创建函数,得到文件得路径*/
create function fn_GetFilePath(@filename nvarchar(260))
returns nvarchar(260)   
as
begin
 declare @file_path nvarchar(260)
 declare @filename_reverse nvarchar(260)
 select @filename_reverse=reverse(@filename)
 select @file_path=substring(@filename,1,len(@filename)+1-charindex('\',@filename_reverse))
 return @file_path
end




GO
